const express = require('express');
const cors = require('cors');
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// FatSecret OAuth 1.0a Credentials (from .env or hardcoded)
const CONSUMER_KEY = process.env.CONSUMER_KEY || '9eb7611656d846028cc2700962470d8f';
const CONSUMER_SECRET = process.env.CONSUMER_SECRET || '767131fbefad4c9e8b40bd28b031a2d5';

// Initialize OAuth
const oauth = OAuth({
    consumer: {
        key: CONSUMER_KEY,
        secret: CONSUMER_SECRET
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
        return crypto
            .createHmac('sha1', key)
            .update(base_string)
            .digest('base64');
    }
});

/**
 * Convert UPC-E to EAN-13
 * UPC-E is a 6 digit code that expands to EAN-13
 */
function expandUPCE(upcE) {
    if (!upcE || upcE.length !== 12) return null; // Need with check digit
    
    const digits = upcE.split('');
    const system = digits[0];
    const check = digits[11];
    const pattern = digits[10];
    let ean13;

    // UPC-E expansion rules
    if (pattern === '0') {
        ean13 = system + digits.slice(1, 4).join('') + '00' + digits.slice(4, 7).join('') + check;
    } else if (pattern === '1') {
        ean13 = system + digits.slice(1, 4).join('') + '10' + digits.slice(4, 7).join('') + check;
    } else if (pattern === '2') {
        ean13 = system + digits.slice(1, 4).join('') + '20' + digits.slice(4, 7).join('') + check;
    } else if (pattern === '3') {
        ean13 = system + digits.slice(1, 5).join('') + '00' + digits.slice(5, 7).join('') + check;
    } else if (pattern === '4') {
        ean13 = system + digits.slice(1, 6).join('') + '0' + digits[6] + '0' + check;
    } else if (pattern === '5') {
        ean13 = system + digits.slice(1, 7).join('') + '0000' + check;
    } else if (pattern === '6' || pattern === '7' || pattern === '8' || pattern === '9') {
        ean13 = system + digits.slice(1, 8).join('') + pattern + '00' + check;
    }
    
    return ean13;
}

/**
 * Normalize barcode to try multiple formats
 * Returns array of barcode variations to try
 */
function normalizeBarcode(rawBarcode) {
    const cleaned = rawBarcode.trim().replace(/[^0-9]/g, '');
    const variations = new Set([cleaned]); // Original

    // If UPC-E (8 digits), try to expand to EAN-13
    if (cleaned.length === 8) {
        // Pad to 12 digits for expansion (assuming check digit 0)
        const padded = '0' + cleaned + '0';
        const expanded = expandUPCE(padded);
        if (expanded) {
            variations.add(expanded);
        }
        // Also try with leading 0
        variations.add('0' + cleaned);
    }

    // If we have a code, also try with different check digits or formats
    if (cleaned.length === 12) {
        const expanded = expandUPCE(cleaned);
        if (expanded) {
            variations.add(expanded);
        }
    }

    // Try standard EAN formats
    if (cleaned.length === 13) {
        variations.add(cleaned); // EAN-13
        variations.add(cleaned.substring(1)); // Remove leading digit
    }

    if (cleaned.length === 14) {
        // Remove check digit and try both ways
        variations.add(cleaned.substring(1)); // 13 digits
        variations.add(cleaned.substring(0, 13)); // 13 digits
    }

    console.log('📊 Barcode Variations to Try:', Array.from(variations));
    return Array.from(variations);
}

/**
 * Search for food by barcode
 * GET /api/food/barcode/:barcode
 */
app.get('/api/food/barcode/:barcode', async (req, res) => {
    try {
        const rawBarcode = req.params.barcode;
        console.log('\n🔍 BARCODE SEARCH REQUEST');
        console.log('📦 Raw Barcode:', rawBarcode);
        
        // Get all barcode variations to try
        const barcodeVariations = normalizeBarcode(rawBarcode);
        
        const url = 'https://platform.fatsecret.com/rest/server.api';

        // Try each barcode variation
        for (const barcode of barcodeVariations) {
            try {
                console.log(`\n🔄 Trying barcode format: ${barcode}`);
                
                const params = {
                    method: 'food.search',
                    search_expression: barcode,
                    format: 'json'
                };

                const request_data = {
                    url: url,
                    method: 'POST',
                    data: params
                };

                const auth = oauth.authorize(request_data);
                
                // Combine all parameters (OAuth + request params)
                const allParams = {
                    ...params,
                    ...auth
                };

                // Build query string
                const queryString = new URLSearchParams(allParams).toString();
                const fullUrl = `${url}?${queryString}`;

                console.log('📤 Making request with OAuth params in URL...');
                console.log('🔗 Method:', params.method);

                const response = await axios.post(fullUrl, '', {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });

                console.log('✅ FatSecret Response Status:', response.status);
                const data = response.data;
                
                // Check if we got a valid response with food
                if (data && !data.error && data.foods && data.foods.food) {
                    console.log('🎉 FOUND! Using barcode:', barcode);
                    console.log('📋 Found', Array.isArray(data.foods.food) ? data.foods.food.length : 1, 'product(s)');
                    return res.json(data);
                } else if (data.error) {
                    console.log('⚠️ API Error for', barcode, ':', data.error.message, '(Code: ' + data.error.code + ')');
                    
                    // If it's an invalid method error, try alternative methods
                    if (data.error.code === 10) { // "Unknown method"
                        console.log('💡 Trying alternative API methods...');
                        
                        // Try food.search.v2
                        const altParams = {
                            ...params,
                            method: 'food.search.v2'
                        };
                        const altAuth = oauth.authorize({ ...request_data, data: altParams });
                        const altAllParams = { ...altParams, ...altAuth };
                        const altQueryString = new URLSearchParams(altAllParams).toString();
                        const altFullUrl = `${url}?${altQueryString}`;
                        
                        try {
                            console.log('🔄 Trying food.search.v2...');
                            const altResponse = await axios.post(altFullUrl, '', {
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                            });
                            
                            if (altResponse.data && !altResponse.data.error && altResponse.data.foods) {
                                console.log('🎉 FOUND with v2! Using barcode:', barcode);
                                return res.json(altResponse.data);
                            }
                        } catch (e) {
                            console.log('❌ v2 also failed:', e.message);
                        }
                    }
                }
            } catch (tryError) {
                console.log('❌ Failed for barcode', barcode, ':', tryError.message);
                continue; // Try next variation
            }
        }

        // None of the variations worked
        console.log('❌ No products found with any barcode variation');
        res.json({
            error: 'No products found',
            tried: barcodeVariations
        });

    } catch (error) {
        console.error('\n❌ BARCODE SEARCH ERROR');
        console.error('📍 Error Message:', error.message);
        console.error('🔗 Error Response:', error.response?.data);
        res.status(500).json({ 
            error: 'Failed to search food',
            details: error.message,
            fatsecretError: error.response?.data
        });
    }
});

/**
 * Search for food by name
 * GET /api/food/search/:query
 */
app.get('/api/food/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        console.log('\n🔍 FOOD SEARCH REQUEST');
        console.log('🔎 Query:', query);
        
        const url = 'https://platform.fatsecret.com/rest/server.api';
        
        const params = {
            method: 'food.search',
            search_expression: query,
            format: 'json'
        };

        const request_data = {
            url: url,
            method: 'POST',
            data: params
        };

        const auth = oauth.authorize(request_data);
        const allParams = { ...params, ...auth };
        const queryString = new URLSearchParams(allParams).toString();
        const fullUrl = `${url}?${queryString}`;

        console.log('📤 Making search request...');

        const response = await axios.post(fullUrl, '', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('✅ Search Response:', response.data);
        res.json(response.data);

    } catch (error) {
        console.error('❌ Search Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to search food',
            details: error.message
        });
    }
});

/**
 * Get detailed food information
 * GET /api/food/:foodId
 */
app.get('/api/food/:foodId', async (req, res) => {
    try {
        const foodId = req.params.foodId;
        console.log('\n🔍 FOOD DETAILS REQUEST');
        console.log('🆔 Food ID:', foodId);
        
        const url = 'https://platform.fatsecret.com/rest/server.api';
        
        const params = {
            method: 'food.get',
            food_id: foodId,
            format: 'json'
        };

        const request_data = {
            url: url,
            method: 'POST',
            data: params
        };

        const auth = oauth.authorize(request_data);
        const allParams = { ...params, ...auth };
        const queryString = new URLSearchParams(allParams).toString();
        const fullUrl = `${url}?${queryString}`;

        console.log('📤 Making food details request...');

        const response = await axios.post(fullUrl, '', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('✅ Food Details Response:', response.data);
        res.json(response.data);

    } catch (error) {
        console.error('❌ Food Details Error:', error.message);
        res.status(500).json({ 
            error: 'Failed to fetch food details',
            details: error.message
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'CalTrack Backend running' });
});

// Test OAuth connection
app.get('/api/test-oauth', async (req, res) => {
    try {
        console.log('\n🧪 TESTING OAUTH CONNECTION');
        console.log('🔑 Consumer Key:', CONSUMER_KEY.substring(0, 10) + '...');
        console.log('🔐 Consumer Secret:', CONSUMER_SECRET.substring(0, 10) + '...');
        
        const url = 'https://platform.fatsecret.com/rest/server.api';
        
        // Test with a real search (searching for "apple")
        const params = {
            method: 'food.search',
            search_expression: 'apple',
            format: 'json'
        };

        const request_data = {
            url: url,
            method: 'POST',
            data: params
        };

        // Generate OAuth signature
        const auth = oauth.authorize(request_data);
        
        // Combine all parameters (OAuth + request params)
        const allParams = {
            ...params,
            ...auth
        };

        // Build query string
        const queryString = new URLSearchParams(allParams).toString();
        const fullUrl = `${url}?${queryString}`;

        console.log('✅ OAuth Params Generated');
        console.log('📤 Testing API connection with OAuth params in URL...');
        console.log('🔗 URL:', fullUrl.substring(0, 100) + '...');

        const response = await axios.post(fullUrl, '', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('✅ FatSecret Test Response:', response.data);
        res.json({
            status: 'OAuth connection successful!',
            message: 'API is working and responding to food.search',
            fatsecretResponse: response.data,
            keys: {
                keyLength: CONSUMER_KEY.length,
                secretLength: CONSUMER_SECRET.length
            }
        });

    } catch (error) {
        console.error('❌ OAuth Test Failed:', error.message);
        console.error('Response:', error.response?.data);
        res.status(500).json({
            error: 'OAuth connection failed',
            message: error.message,
            fatsecretError: error.response?.data
        });
    }
});

// Catch-all route
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found' });
    } else {
        res.sendFile(__dirname + '/Main.html');
    }
});

app.listen(PORT, () => {
    console.log(`🚀 CalTrack Backend running on http://localhost:${PORT}`);
    console.log(`📊 Open http://localhost:${PORT} in your browser`);
});
