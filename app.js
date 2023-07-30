// Constants
const base64StopId1 = 'U3RvcDpIU0w6MTMwMTQ1NQ=='; // U3RvcDpIU0w6MTMwMTQ1NA== the wrong one
const base64StopId2 = 'U3RvcDpIU0w6MTMwMTQ1NQ=='; // U3RvcDpIU0w6MTMwMTQ1NQ== the good one
const apiKey = '8e34621efbb24fa6ac76eac6994fcfe0';
const apiCallSeconds = [39, 35, 25, 15, 10, 8, 0];

// Global Variables
let nextRealtimeArrival1 = null;
let nextScheduledArrival1 = null;
let nextRealtimeArrival2 = null;
let nextScheduledArrival2 = null;

// Helper Functions
function decodeBase64ToNumericalId(base64Id) {
    const decoded = atob(base64Id);
    return decoded.split(':')[2];
}

function currentTimeInSecondsFromMidnight() {
    const helsinkiTime = moment.tz('Europe/Helsinki');
    return helsinkiTime.hour() * 60 * 60 + helsinkiTime.minute() * 60 + helsinkiTime.second();
}

function executeAt(delaySeconds, callback) {
    const delayMillis = delaySeconds * 1000;
    setTimeout(callback, delayMillis);
}

// Define the stop IDs outside the fetchNextTramArrivals function
const stopId1 = decodeBase64ToNumericalId(base64StopId1);
const stopId2 = decodeBase64ToNumericalId(base64StopId2);

function updateTimerDisplay() {
    console.log("updatetimerdisplay called")
    const currentTime = currentTimeInSecondsFromMidnight();
    const times = [
        { realtime: nextRealtimeArrival1, scheduled: nextScheduledArrival1 },
        { realtime: nextRealtimeArrival2, scheduled: nextScheduledArrival2 }
    ];
    times.sort((a, b) => a.realtime - b.realtime);

    const { realtime, scheduled } = times[0];
    updateStopTimerDisplay(realtime, scheduled, currentTime, 'nextArrival1');
}

function updateStopTimerDisplay(realtimeArrival, scheduledArrival, currentTime, elementId) {
    const timeUntilRealtimeArrival = realtimeArrival - currentTime;
    const timeUntilScheduledArrival = scheduledArrival - currentTime;
    const differenceInSeconds = timeUntilRealtimeArrival - timeUntilScheduledArrival;
    
    const displayContent = formatTimeDisplay(
        timeUntilRealtimeArrival, 
        differenceInSeconds > 0 ? 'late' : 'early', 
        Math.abs(differenceInSeconds)
    );
    
    document.getElementById(elementId).textContent = displayContent;
}

function formatTimeDisplay(time, earlyOrLate, difference) {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    const differenceMinutes = Math.floor(difference / 60);
    const differenceSeconds = difference % 60;
    
    if (difference === 0) {
        return `Next tram arrives in: ${minutes} minutes and ${seconds} seconds`;
    } else {
        return `Next tram arrives in: ${minutes} minutes and ${seconds} seconds (${differenceMinutes} minutes and ${differenceSeconds} seconds ${earlyOrLate})`;
    }
}

function fetchNextTramArrivals() {
    // Construct the API URL
    const apiUrl = `https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql`;

    // Construct the GraphQL query for the correct stops
    const query = `
        {
            stop1: stop(id: "HSL:${stopId1}") {
                name
                stoptimesWithoutPatterns {
                    realtimeArrival
                    scheduledArrival
                }
            }
            stop2: stop(id: "HSL:${stopId2}") {
                name
                stoptimesWithoutPatterns {
                    realtimeArrival
                    scheduledArrival
                }
            }
        }
    `;

    // Send the request for the correct stops
    fetch(apiUrl, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'digitransit-subscription-key': apiKey
        },
        body: JSON.stringify({ query }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Visualize data refresh
        console.log("data refreshed")
        document.getElementById('nextArrival1').classList.add('flash');
        setTimeout(() => {
            document.getElementById('nextArrival1').classList.remove('flash');
        }, 2000);  // Remove the class after the same amount of time as the animation

        // Process the stop times for both stops
        processStopTimes(data.data.stop1, 'nextArrival1');
        processStopTimes(data.data.stop2, 'nextArrival2');

        // Schedule the next fetch
        scheduleNextFetch();
    });
}

function processStopTimes(stop, elementId) {
    if (!stop || stop.stoptimesWithoutPatterns.length === 0) {
        document.getElementById(elementId).textContent = "No tram data available.";
        return;
    }
    
    const currentTime = currentTimeInSecondsFromMidnight();
    let nextArrival = stop.stoptimesWithoutPatterns.find(arrival => {
        let arrivalTime = normalizeTime(arrival.realtimeArrival, currentTime);
        return arrivalTime > currentTime;
    });

    if (nextArrival) {
        let realtimeArrival = normalizeTime(nextArrival.realtimeArrival, currentTime);
        let scheduledArrival = normalizeTime(nextArrival.scheduledArrival, currentTime);
        if (elementId === 'nextArrival1') {
            nextRealtimeArrival1 = realtimeArrival;
            nextScheduledArrival1 = scheduledArrival;
        } else if (elementId === 'nextArrival2') {
            nextRealtimeArrival2 = realtimeArrival;
            nextScheduledArrival2 = scheduledArrival;
        }
    } else {
        document.getElementById(elementId).textContent = "No upcoming trams.";
    }
}

function normalizeTime(time, currentTime) {
    // If the time is more than a day away, subtract 24 hours
    if (time > currentTime + 24 * 60 * 60) {
        return time - 24 * 60 * 60;
    }
    return time;
}

function scheduleNextFetch() {
    const currentTime = currentTimeInSecondsFromMidnight();

    // Compute the time remaining until the next arrival
    const times = [
        nextRealtimeArrival1,
        nextRealtimeArrival2
    ].filter(t => t != null);

    if (times.length === 0) {
        return;
    }

    const minTimeRemaining = Math.min(...times.map(t => t - currentTime));
    const nextFetch = apiCallSeconds.find(s => s < minTimeRemaining);

    if (nextFetch != null) {
        executeAt(minTimeRemaining - nextFetch, fetchNextTramArrivals);
    }
}


// Fetch Tram Arrival Times
fetchNextTramArrivals();

// Update Timer Display
setInterval(updateTimerDisplay, 1000);
