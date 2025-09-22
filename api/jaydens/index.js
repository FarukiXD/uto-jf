const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

let rawData = [];
let processedJobIds = new Set();

app.post('/api/dataSend', (req, res) => {
    try {
        const data = req.body;
        const newData = [];

        data.forEach(item => {
            if (!processedJobIds.has(item.jobId)) {
                processedJobIds.add(item.jobId);
                rawData.push(item);
                newData.push(item);
            }
        });

        // Clean up old data
        const currentTime = Date.now();
        rawData = rawData.filter(item => currentTime - item.timestamp < 100000);

        res.status(200).json({ message: 'Data received', newData });
    } catch (error) {
        console.error('Error processing data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/jaydens', (req, res) => {
    try {
        // Filter out old data
        const currentTime = Date.now();
        const filteredData = rawData.filter(item => currentTime - item.timestamp < 100000);

        res.status(200).json(filteredData);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/jaydens/users', (req, res) => {
    try {
        // Simple user count endpoint
        const userCount = new Set(rawData.map(item => item.userId)).size;
        res.status(200).json({ userCount });
    } catch (error) {
        console.error('Error fetching user count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
