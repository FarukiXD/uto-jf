// Brainrot Detection API
// Vercel serverless function

let brainrotData = [];
let userData = [];
let processedJobIds = new Set();

// Helper function to clean old data (older than 100 seconds)
function cleanOldData() {
    const now = Date.now();
    brainrotData = brainrotData.filter(item => {
        const itemAge = (now - item.timestamp) / 1000;
        return itemAge <= 100;
    });
}

// Helper function to update secago values
function updateSecAgo() {
    const now = Date.now();
    brainrotData.forEach(item => {
        const ageInSeconds = Math.floor((now - item.timestamp) / 1000);
        item.secago = Math.max(0, 100 - ageInSeconds).toString();
    });
}

// Helper function to process new brainrot data
function processBrainrotData(data) {
    try {
        const { userId, jobId, brainrots } = data;
        
        if (!userId || !jobId || !Array.isArray(brainrots)) {
            return { success: false, error: 'Invalid data format' };
        }
        
        // Check if this exact jobId was already processed
        if (processedJobIds.has(jobId)) {
            return { success: true, message: 'Job already processed' };
        }
        
        const timestamp = Date.now();
        let addedCount = 0;
        
        brainrots.forEach(brainrot => {
            if (brainrot.brainrot && brainrot.value && brainrot.numericValue >= 1000000) {
                // Check if similar data already exists
                const existingIndex = brainrotData.findIndex(item => 
                    item.brainrot === brainrot.brainrot && 
                    item.value === brainrot.value &&
                    item.userId === userId
                );
                
                if (existingIndex === -1) {
                    // Add new data
                    brainrotData.push({
                        brainrot: brainrot.brainrot,
                        value: brainrot.value,
                        jobId: jobId,
                        userId: userId,
                        secago: "100",
                        timestamp: timestamp
                    });
                    addedCount++;
                } else {
                    // Update existing data with new timestamp and jobId
                    brainrotData[existingIndex].timestamp = timestamp;
                    brainrotData[existingIndex].jobId = jobId;
                    brainrotData[existingIndex].secago = "100";
                }
            }
        });
        
        // Mark this jobId as processed
        processedJobIds.add(jobId);
        
        // Clean processed job IDs if too many (keep last 100)
        if (processedJobIds.size > 100) {
            const jobIdArray = Array.from(processedJobIds);
            processedJobIds = new Set(jobIdArray.slice(-50));
        }
        
        return { 
            success: true, 
            message: `Processed ${addedCount} new brainrots`,
            totalBrainrots: brainrotData.length 
        };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Helper function to process user data
function processUserData(data) {
    try {
        const { userId, displayName, username } = data;
        
        if (!userId) {
            return { success: false, error: 'Missing userId' };
        }
        
        // Check if user already exists
        const existingUserIndex = userData.findIndex(user => user.userId === userId);
        
        if (existingUserIndex === -1) {
            userData.push({
                userId,
                displayName: displayName || 'Unknown',
                username: username || 'Unknown',
                firstSeen: new Date().toISOString(),
                executeCount: 1
            });
        } else {
            userData[existingUserIndex].executeCount += 1;
            userData[existingUserIndex].lastSeen = new Date().toISOString();
            if (displayName) userData[existingUserIndex].displayName = displayName;
            if (username) userData[existingUserIndex].username = username;
        }
        
        return { success: true, totalUsers: userData.length };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Main API handler
export default function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    
    try {
        // Clean old data and update secago on every request
        cleanOldData();
        updateSecAgo();
        
        // Handle different endpoints
        switch (pathname) {
            case '/api/jaydens':
                if (req.method === 'GET') {
                    // Return all brainrot data
                    const responseData = brainrotData.map(item => ({
                        brainrot: item.brainrot,
                        value: item.value,
                        jobId: item.jobId,
                        secago: item.secago
                    }));
                    
                    return res.status(200).json(responseData);
                }
                break;
                
            case '/api/jaydens/dataSend':
            case '/api/jaydens/datasend':
                if (req.method === 'POST') {
                    const result = processBrainrotData(req.body);
                    
                    if (result.success) {
                        return res.status(200).json({
                            success: true,
                            message: result.message,
                            totalBrainrots: result.totalBrainrots || brainrotData.length
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            error: result.error
                        });
                    }
                }
                break;
                
            case '/api/jaydens/users':
                if (req.method === 'POST') {
                    const result = processUserData(req.body);
                    
                    if (result.success) {
                        return res.status(200).json({
                            success: true,
                            totalUsers: result.totalUsers
                        });
                    } else {
                        return res.status(400).json({
                            success: false,
                            error: result.error
                        });
                    }
                } else if (req.method === 'GET') {
                    return res.status(200).json({
                        totalUsers: userData.length,
                        users: userData
                    });
                }
                break;
                
            case '/api/jaydens/stats':
                if (req.method === 'GET') {
                    return res.status(200).json({
                        totalBrainrots: brainrotData.length,
                        totalUsers: userData.length,
                        processedJobIds: processedJobIds.size,
                        lastUpdate: new Date().toISOString()
                    });
                }
                break;
                
            default:
                return res.status(404).json({ 
                    success: false, 
                    error: 'Endpoint not found' 
                });
        }
        
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            details: error.message 
        });
    }
}

// Auto cleanup interval (runs every 30 seconds when there are requests)
setInterval(() => {
    if (brainrotData.length > 0) {
        cleanOldData();
        updateSecAgo();
    }
}, 30000);
