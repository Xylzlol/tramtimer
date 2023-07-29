
        let apiCallMadeAt30Sec = false;
        let apiCallMadeAt15Sec = false;
        // Base64-encoded stop IDs for the correct Tiilimäki stops
        const base64StopId1 = 'U3RvcDpIU0w6MTMwMTQ1NA==';
        const base64StopId2 = 'U3RvcDpIU0w6MTMwMTQ1NQ==';

        // Function to decode base64 to numerical ID
        function decodeBase64ToNumericalId(base64Id) {
            const decoded = atob(base64Id);
            return decoded.split(':')[2];
        }

        // Your API key
        const apiKey = '8e34621efbb24fa6ac76eac6994fcfe0';

        // Timer interval (in milliseconds)
        const timerInterval = 60000; // 1 minute

        // Next tram arrival times in seconds from midnight
        let nextRealtimeArrival1 = null;
        let nextScheduledArrival1 = null;
        let nextRealtimeArrival2 = null;
        let nextScheduledArrival2 = null;

        // Returns the current time in seconds from midnight
        function currentTimeInSecondsFromMidnight() {
            const now = new Date();
            return ((now.getHours() * 60 + now.getMinutes()) * 60) + now.getSeconds();
        }

        // Fetch next tram arrivals initially and start the timer
        fetchNextTramArrivals();
        setInterval(fetchNextTramArrivals, timerInterval);  // Update tram arrival data every minute
        setInterval(updateTimerDisplay, 1000);  // Update timer display every second

        function updateTimerDisplay() {
            const currentTime = currentTimeInSecondsFromMidnight();
            // Calculate the time until arrival for both trams
            const timeUntilNextRealtimeArrival1 = nextRealtimeArrival1 - currentTime;
            const timeUntilNextRealtimeArrival2 = nextRealtimeArrival2 - currentTime;
            const timeUntilNextScheduledArrival1 = nextScheduledArrival1 - currentTime;
            const timeUntilNextScheduledArrival2 = nextScheduledArrival2 - currentTime;

            // Check which tram is closer
            let nextRealtimeArrival;
            let nextScheduledArrival;
            if (timeUntilNextRealtimeArrival1 < timeUntilNextRealtimeArrival2) {
                nextRealtimeArrival = nextRealtimeArrival1;
                nextScheduledArrival = nextScheduledArrival1;
            } else {
                nextRealtimeArrival = nextRealtimeArrival2;
                nextScheduledArrival = nextScheduledArrival2;
            }

            // If the time until next arrival is 0 or less, fetch the next tram arrival time
            if (nextRealtimeArrival <= currentTime) {
        fetchNextTramArrivals();
        // Reset the flags
        apiCallMadeAt30Sec = false;
        apiCallMadeAt15Sec = false;
        return;
    } else if (nextRealtimeArrival - currentTime <= 30 && !apiCallMadeAt30Sec) { // 30 seconds or less until arrival
        fetchNextTramArrivals();
        apiCallMadeAt30Sec = true;  // Mark that the API call was made
    } else if (nextRealtimeArrival - currentTime <= 15 && !apiCallMadeAt15Sec) { // 15 seconds or less until arrival
        fetchNextTramArrivals();
        apiCallMadeAt15Sec = true;  // Mark that the API call was made
    } else if (nextScheduledArrival <= currentTime && nextRealtimeArrival > currentTime) {
        const lateSeconds = nextRealtimeArrival - currentTime;
        const lateMinutes = Math.floor(lateSeconds / 60);
        const lateRemainingSeconds = lateSeconds % 60;
        document.getElementById('nextArrival1').textContent = `Next tram arrives in: ${lateMinutes} minutes and ${lateRemainingSeconds} seconds (${lateMinutes} minutes and ${lateRemainingSeconds} seconds late)`;
        return;
    }

            // If the scheduled arrival time has passed but the real-time arrival time has not, continue to display the countdown
            if (nextScheduledArrival <= currentTime && nextRealtimeArrival > currentTime) {
                const overdueSeconds = nextRealtimeArrival - currentTime;
                updateStopTimerDisplay(nextRealtimeArrival, nextScheduledArrival, currentTime, 'nextArrival1');
                return;
            }
            // If the real-time arrival time has passed but the scheduled arrival time has not, continue to display the countdown
            else if (nextRealtimeArrival <= currentTime && nextScheduledArrival > currentTime) {
                const earlySeconds = nextScheduledArrival - currentTime;
                updateStopTimerDisplay(nextRealtimeArrival, nextScheduledArrival, currentTime, 'nextArrival1');
                return;
            } else {
                // Otherwise, format the time into minutes and seconds
                updateStopTimerDisplay(nextRealtimeArrival, nextScheduledArrival, currentTime, 'nextArrival1');
            }
        }

        function updateStopTimerDisplay(nextRealtimeArrival, nextScheduledArrival, currentTime, elementId) {
            // Calculate the time until arrival
            const timeUntilRealtimeArrival = nextRealtimeArrival - currentTime;
            const timeUntilScheduledArrival = nextScheduledArrival - currentTime;

            // If the real-time and scheduled arrival times are the same, only display one time
            if (timeUntilRealtimeArrival === timeUntilScheduledArrival) {
                const minutes = Math.floor(timeUntilRealtimeArrival / 60);
                const seconds = timeUntilRealtimeArrival % 60;
                document.getElementById(elementId).textContent = `Next tram arrives in: ${minutes} minutes and ${seconds} seconds`;
            } else {
                // Otherwise, calculate the difference between the real-time and scheduled arrival times
                const differenceInSeconds = timeUntilRealtimeArrival - timeUntilScheduledArrival;
                const differenceMinutes = Math.floor(Math.abs(differenceInSeconds) / 60);
                const differenceSeconds = Math.abs(differenceInSeconds) % 60;
                const earlyOrLate = differenceInSeconds > 0 ? 'late' : 'early';

                // Format the time into minutes and seconds for the real-time arrival time, and include the difference
                const realtimeMinutes = Math.floor(timeUntilRealtimeArrival / 60);
                const realtimeSeconds = timeUntilRealtimeArrival % 60;
                document.getElementById(elementId).textContent = `Next tram arrives in: ${realtimeMinutes} minutes and ${realtimeSeconds} seconds (${differenceMinutes} minutes and ${differenceSeconds} seconds ${earlyOrLate})`;
            }
        }

        function fetchNextTramArrivals() {
            // Construct the API URL
            const apiUrl = `https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql`;

            // Construct the GraphQL query for the correct stops
            const stopId1 = decodeBase64ToNumericalId(base64StopId1);
            const stopId2 = decodeBase64ToNumericalId(base64StopId2);
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
                // Process the stop times for both stops
                processStopTimes(data.data.stop1, 'nextArrival1', nextRealtimeArrival1);
                processStopTimes(data.data.stop2, 'nextArrival2', nextRealtimeArrival2);
            })
        }

        function processStopTimes(stop, elementId, currentRealtimeArrival) {
    if (stop && stop.stoptimesWithoutPatterns.length > 0) {
        stop.stoptimesWithoutPatterns.sort((a, b) => a.realtimeArrival - b.realtimeArrival);

        const currentTime = currentTimeInSecondsFromMidnight();

        // Find the first realtimeArrival that is greater than the current time
        const nextArrival = stop.stoptimesWithoutPatterns.find(stoptime => stoptime.realtimeArrival > currentTime);
        if (nextArrival) {
            if (elementId === 'nextArrival1') {
                nextRealtimeArrival1 = nextArrival.realtimeArrival;
                nextScheduledArrival1 = nextArrival.scheduledArrival;
            } else if (elementId === 'nextArrival2') {
                nextRealtimeArrival2 = nextArrival.realtimeArrival;
                nextScheduledArrival2 = nextArrival.scheduledArrival;
            }
        } else {
            document.getElementById(elementId).textContent = "No upcoming trams.";
        }
    } else {
        document.getElementById(elementId).textContent = "No tram data available.";
    }
}

