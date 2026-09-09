// ======================================================
// ESP32 CONFIGURATION
// ======================================================

// CHANGE THIS TO YOUR ESP32 IP

const ESP32_IP = "192.168.1.10";

const WS_URL =
    `ws://${ESP32_IP}:8080`;


// ======================================================
// HTML ELEMENTS
// ======================================================

const connectionDot =
    document.getElementById("connectionDot");

const connectionText =
    document.getElementById("connectionText");

const statusBadge =
    document.getElementById("statusBadge");

const statusText =
    document.getElementById("statusText");

const statusDescription =
    document.getElementById(
        "statusDescription"
    );

const peakFrequency =
    document.getElementById(
        "peakFrequency"
    );

const noiseFloor =
    document.getElementById(
        "noiseFloor"
    );

const anomalyScore =
    document.getElementById(
        "anomalyScore"
    );

const frictionEnergy =
    document.getElementById(
        "frictionEnergy"
    );

const uptimeElement =
    document.getElementById(
        "uptime"
    );

const sampleRate =
    document.getElementById(
        "sampleRate"
    );

const fftSize =
    document.getElementById(
        "fftSize"
    );

const frictionThreshold =
    document.getElementById(
        "frictionThreshold"
    );

const calibrationStatus =
    document.getElementById(
        "calibrationStatus"
    );

const lastUpdate =
    document.getElementById(
        "lastUpdate"
    );

const wsUrl =
    document.getElementById(
        "wsUrl"
    );

const eventLogBody =
    document.getElementById(
        "eventLogBody"
    );

const totalEvents =
    document.getElementById(
        "totalEvents"
    );

const criticalCount =
    document.getElementById(
        "criticalCount"
    );

const filterInput =
    document.getElementById(
        "filterInput"
    );

const filterLevel =
    document.getElementById(
        "filterLevel"
    );

const calibrateBtn =
    document.getElementById(
        "calibrateBtn"
    );

const resetBtn =
    document.getElementById(
        "resetBtn"
    );

const exportBtn =
    document.getElementById(
        "exportBtn"
    );

const toast =
    document.getElementById(
        "toast"
    );

const chartSection =
    document.getElementById(
        "chartSection"
    );


// ======================================================
// VARIABLES
// ======================================================

let socket = null;


// Previous machine state

let previousStatus =
    "UNKNOWN";


// Store all events

let eventLog = [];


// Reconnect timer

let reconnectTimer = null;


// Toast timer

let toastTimer = null;


// Application start time

const applicationStartTime =
    Date.now();


// ======================================================
// WEBSOCKET URL DISPLAY
// ======================================================

wsUrl.textContent =
    WS_URL;


// ======================================================
// CHART
// ======================================================

const chartCanvas =
    document.getElementById(
        "frequencyChart"
    );


const frequencyChart =
    new Chart(
        chartCanvas,
        {

            type: "line",

            data: {

                labels: [],

                datasets: [

                    {

                        label:
                            "Frequency Spectrum",

                        data: [],

                        borderWidth: 2,

                        pointRadius: 0,

                        tension: 0.25,

                        fill: true,

                        borderColor:
                            "#3498db",

                        backgroundColor:
                            "rgba(52, 152, 219, 0.12)"

                    }

                ]

            },


            options: {

                responsive: true,

                maintainAspectRatio: false,

                animation: false,


                interaction: {

                    intersect: false

                },


                plugins: {

                    legend: {

                        display: false

                    }

                },


                scales: {

                    x: {

                        title: {

                            display: true,

                            text:
                                "Frequency (Hz)"

                        },

                        ticks: {

                            maxTicksLimit: 12

                        }

                    },


                    y: {

                        beginAtZero: true,

                        title: {

                            display: true,

                            text:
                                "Amplitude"

                        }

                    }

                }

            }

        }
    );


// ======================================================
// WEBSOCKET CONNECTION
// ======================================================

function connectWebSocket() {


    console.log(
        "Connecting to:",
        WS_URL
    );


    connectionText.textContent =
        "Connecting...";


    connectionDot.className =
        "status-dot connecting";


    socket =
        new WebSocket(
            WS_URL
        );


    // ==================================================
    // CONNECTED
    // ==================================================

    socket.onopen =
        function () {


            console.log(
                "WebSocket connected!"
            );


            connectionText.textContent =
                "ESP32 Connected";


            connectionDot.className =
                "status-dot connected";


            showToast(
                "ESP32 connected successfully.",
                "success"
            );

        };


    // ==================================================
    // MESSAGE
    // ==================================================

    socket.onmessage =
        function (event) {


            try {


                const data =
                    JSON.parse(
                        event.data
                    );


                console.log(
                    "ESP32 DATA:",
                    data
                );


                updateDashboard(
                    data
                );


            }

            catch (error) {


                console.error(
                    "Invalid JSON from ESP32:",
                    error
                );


            }

        };


    // ==================================================
    // CLOSED
    // ==================================================

    socket.onclose =
        function () {


            console.log(
                "WebSocket disconnected"
            );


            connectionText.textContent =
                "Disconnected";


            connectionDot.className =
                "status-dot disconnected";


            statusText.textContent =
                "OFFLINE";


            statusBadge.className =
                "status-badge";


            statusDescription.textContent =
                "Unable to receive data from ESP32.";


            scheduleReconnect();

        };


    // ==================================================
    // ERROR
    // ==================================================

    socket.onerror =
        function (error) {


            console.error(
                "WebSocket error:",
                error
            );


            connectionText.textContent =
                "Connection Error";


            connectionDot.className =
                "status-dot disconnected";

        };

}


// ======================================================
// AUTOMATIC RECONNECT
// ======================================================

function scheduleReconnect() {


    if (
        reconnectTimer !== null
    ) {

        return;

    }


    reconnectTimer =
        setTimeout(
            function () {


                reconnectTimer =
                    null;


                connectWebSocket();


            },
            3000
        );

}


// ======================================================
// UPDATE DASHBOARD
// ======================================================

function updateDashboard(
    data
) {


    // ==================================================
    // STATUS
    // ==================================================

    const status =
        String(
            data.status ||
            "UNKNOWN"
        ).toUpperCase();


    // ==================================================
    // DETECT NEW CRITICAL EVENT
    // ==================================================

    if (
        status === "CRITICAL" &&
        previousStatus !== "CRITICAL"
    ) {


        handleCriticalEvent(
            data
        );

    }


    previousStatus =
        status;


    // ==================================================
    // UPDATE STATUS UI
    // ==================================================

    updateStatus(
        status
    );


    // ==================================================
    // ANOMALY SCORE
    // ==================================================

    const score =
        Number(
            data.anomalyScore || 0
        );


    anomalyScore.textContent =
        score.toFixed(1);


    // ==================================================
    // PEAK FREQUENCY
    // ==================================================

    const frequency =
        Number(
            data.peakFreq || 0
        );


    peakFrequency.textContent =
        frequency.toFixed(1);


    // ==================================================
    // NOISE FLOOR
    // ==================================================

    const noise =
        Number(
            data.noiseFloor || 0
        );


    noiseFloor.textContent =
        noise.toFixed(1);


    // ==================================================
    // FRICTION ENERGY
    // ==================================================

    const energy =
        Number(
            data.frictionEnergy || 0
        );


    frictionEnergy.textContent =
        energy.toFixed(2);


    // ==================================================
    // SAMPLE RATE
    // ==================================================

    if (
        data.sampleRate
    ) {


        sampleRate.textContent =
            data.sampleRate;

    }


    // ==================================================
    // FFT SIZE
    // ==================================================

    if (
        data.fftSize
    ) {


        fftSize.textContent =
            data.fftSize;

    }


    // ==================================================
    // FRICTION THRESHOLD
    // ==================================================

    if (
        data.frictionThreshold !==
        undefined
    ) {


        frictionThreshold.textContent =
            data.frictionThreshold;

    }


    // ==================================================
    // CALIBRATION STATUS
    // ==================================================

    if (
        data.calibration !==
        undefined
    ) {


        calibrationStatus.textContent =
            data.calibration;

    }


    // ==================================================
    // LAST UPDATE
    // ==================================================

    const now =
        new Date();


    lastUpdate.textContent =
        now.toLocaleTimeString();


    // ==================================================
    // FREQUENCY SPECTRUM
    // ==================================================

    if (
        data.frequencySpectrum &&
        Array.isArray(
            data.frequencySpectrum
        )
    ) {


        updateSpectrum(

            data.frequencySpectrum,

            Number(
                data.sampleRate ||
                16000
            ),

            status

        );

    }

}


// ======================================================
// UPDATE STATUS
// ======================================================

function updateStatus(
    status
) {


    // Remove old classes

    statusBadge.classList.remove(
        "healthy",
        "warning",
        "critical"
    );


    // ==================================================
    // HEALTHY
    // ==================================================

    if (
        status === "HEALTHY"
    ) {


        statusBadge.classList.add(
            "healthy"
        );


        statusText.textContent =
            "HEALTHY";


        statusDescription.textContent =
            "Machine operating within normal acoustic range.";


        statusBadge
            .querySelector(
                ".status-icon"
            )
            .textContent =
            "●";


    }


    // ==================================================
    // WARNING
    // ==================================================

    else if (
        status === "WARNING"
    ) {


        statusBadge.classList.add(
            "warning"
        );


        statusText.textContent =
            "WARNING";


        statusDescription.textContent =
            "Abnormal acoustic activity detected.";


        statusBadge
            .querySelector(
                ".status-icon"
            )
            .textContent =
            "⚠";


    }


    // ==================================================
    // CRITICAL
    // ==================================================

    else if (
        status === "CRITICAL"
    ) {


        statusBadge.classList.add(
            "critical"
        );


        statusText.textContent =
            "CRITICAL";


        statusDescription.textContent =
            "Critical anomaly detected. Inspect machine immediately.";


        statusBadge
            .querySelector(
                ".status-icon"
            )
            .textContent =
            "🚨";


    }


    // ==================================================
    // UNKNOWN
    // ==================================================

    else {


        statusText.textContent =
            status;


        statusDescription.textContent =
            "Waiting for valid machine status.";


    }

}


// ======================================================
// UPDATE FREQUENCY SPECTRUM
// ======================================================

function updateSpectrum(
    spectrum,
    samplingRate,
    status
) {


    // ==================================================
    // FFT SIZE
    // ==================================================

    const calculatedFFTSize =
        spectrum.length * 2;


    // ==================================================
    // FREQUENCY LABELS
    // ==================================================

    const labels =
        spectrum.map(
            function (_, index) {


                return (

                    index *
                    samplingRate /
                    calculatedFFTSize

                ).toFixed(0);

            }
        );


    // ==================================================
    // UPDATE DATA
    // ==================================================

    frequencyChart.data.labels =
        labels;


    frequencyChart
        .data
        .datasets[0]
        .data =
        spectrum;


    // ==================================================
    // GRAPH COLOR
    // ==================================================

    if (
        status === "CRITICAL"
    ) {


        // RED LINE

        frequencyChart
            .data
            .datasets[0]
            .borderColor =
            "#e74c3c";


        // RED AREA

        frequencyChart
            .data
            .datasets[0]
            .backgroundColor =
            "rgba(231, 76, 60, 0.20)";


        // RED GLOW AROUND CARD

        chartSection.classList.add(
            "critical"
        );

    }

    else {


        // NORMAL BLUE LINE

        frequencyChart
            .data
            .datasets[0]
            .borderColor =
            "#3498db";


        // NORMAL BLUE AREA

        frequencyChart
            .data
            .datasets[0]
            .backgroundColor =
            "rgba(52, 152, 219, 0.12)";


        chartSection.classList.remove(
            "critical"
        );

    }


    // ==================================================
    // REDRAW
    // ==================================================

    frequencyChart.update();

}


// ======================================================
// HANDLE CRITICAL EVENT
// ======================================================

function handleCriticalEvent(
    data
) {


    console.log(
        "🚨 CRITICAL EVENT DETECTED"
    );


    // ==================================================
    // CREATE EVENT
    // ==================================================

    const now =
        new Date();


    const event = {

        timestamp:
            now.toLocaleString(),

        status:
            "CRITICAL",

        peakFreq:
            Number(
                data.peakFreq || 0
            ),

        anomalyScore:
            Number(
                data.anomalyScore || 0
            )

    };


    // ==================================================
    // ADD EVENT TO LOG
    // ==================================================

    eventLog.push(
        event
    );


    // ==================================================
    // UPDATE TABLE
    // ==================================================

    renderEventLog();


    // ==================================================
    // SHOW ALERT
    // ==================================================

    showCriticalAlert();


    // ==================================================
    // LOG TO CONSOLE
    // ==================================================

    console.log(
        "Critical event logged:",
        event
    );

}


// ======================================================
// CRITICAL ALERT
// ======================================================

function showCriticalAlert() {


    showToast(

        "🚨 ALERT SENT — Critical machine condition detected. Telegram notification sent.",

        "critical"

    );

}


// ======================================================
// TOAST
// ======================================================

function showToast(
    message,
    type = ""
) {


    clearTimeout(
        toastTimer
    );


    toast.textContent =
        message;


    toast.className =
        "toast show " +
        type;


    toastTimer =
        setTimeout(
            function () {


                toast.classList.remove(
                    "show"
                );


            },
            5000
        );

}


// ======================================================
// RENDER EVENT LOG
// ======================================================

function renderEventLog() {


    const search =
        filterInput
            .value
            .toLowerCase()
            .trim();


    const level =
        filterLevel.value;


    // ==================================================
    // FILTER
    // ==================================================

    const filteredEvents =
        eventLog.filter(
            function (event) {


                const matchesSearch =

                    event.timestamp
                        .toLowerCase()
                        .includes(search)

                    ||

                    event.status
                        .toLowerCase()
                        .includes(search);


                const matchesLevel =

                    level === "" ||

                    event.status
                        .toLowerCase() ===
                        level;


                return (
                    matchesSearch &&
                    matchesLevel
                );

            }
        );


    // ==================================================
    // EMPTY TABLE
    // ==================================================

    if (
        filteredEvents.length === 0
    ) {


        eventLogBody.innerHTML = `

            <tr class="empty-row">

                <td colspan="5">

                    No matching events found.

                </td>

            </tr>

        `;

    }


    else {


        eventLogBody.innerHTML =
            "";


        // Newest event first

        filteredEvents
            .slice()
            .reverse()
            .forEach(
                function (
                    event
                ) {


                    const row =
                        document.createElement(
                            "tr"
                        );


                    const statusClass =
                        event.status
                            .toLowerCase();


                    row.innerHTML = `

                        <td>
                            ${event.timestamp}
                        </td>

                        <td>

                            <span
                                class="status-badge-small ${statusClass}">

                                ${event.status}

                            </span>

                        </td>

                        <td>
                            ${event.peakFreq.toFixed(1)}
                        </td>

                        <td>
                            ${event.anomalyScore.toFixed(1)}
                        </td>

                        <td>

                            <button
                                class="delete-btn"
                                onclick="deleteEvent('${event.timestamp}')">

                                Delete

                            </button>

                        </td>

                    `;


                    eventLogBody.appendChild(
                        row
                    );

                }
            );

    }


    // ==================================================
    // STATISTICS
    // ==================================================

    totalEvents.textContent =
        eventLog.length;


    const criticalEvents =
        eventLog.filter(
            function (event) {

                return (
                    event.status ===
                    "CRITICAL"
                );

            }
        );


    criticalCount.textContent =
        criticalEvents.length;

}


// ======================================================
// DELETE EVENT
// ======================================================

function deleteEvent(
    timestamp
) {


    eventLog =
        eventLog.filter(
            function (event) {

                return (
                    event.timestamp !==
                    timestamp
                );

            }
        );


    renderEventLog();

}


// ======================================================
// RESET LOG
// ======================================================

function resetEventLog() {


    if (
        eventLog.length === 0
    ) {


        showToast(
            "Event log is already empty.",
            "warning"
        );


        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to clear the event log?"
        );


    if (!confirmed) {

        return;

    }


    eventLog = [];


    renderEventLog();


    showToast(
        "Event log cleared.",
        "success"
    );

}


// ======================================================
// FILTER EVENTS
// ======================================================

filterInput.addEventListener(
    "input",
    renderEventLog
);


filterLevel.addEventListener(
    "change",
    renderEventLog
);


// ======================================================
// CALIBRATION
// ======================================================

calibrateBtn.addEventListener(
    "click",
    function () {


        // ==================================================
        // CHECK CONNECTION
        // ==================================================

        if (
            !socket ||
            socket.readyState !==
                WebSocket.OPEN
        ) {


            showToast(
                "ESP32 is not connected.",
                "error"
            );


            return;

        }


        // ==================================================
        // COMMAND
        // ==================================================

        const command = {

            command:
                "calibrate"

        };


        // ==================================================
        // SEND COMMAND
        // ==================================================

        socket.send(
            JSON.stringify(
                command
            )
        );


        console.log(
            "Calibration command sent."
        );


        // ==================================================
        // BUTTON
        // ==================================================

        calibrateBtn.disabled =
            true;


        calibrateBtn.innerHTML =
            "⏳ Calibrating...";


        calibrationStatus.textContent =
            "Running";


        showToast(
            "Calibration started. Keep the motor OFF.",
            "warning"
        );


        // ==================================================
        // RESTORE BUTTON
        // ==================================================

        setTimeout(
            function () {


                calibrateBtn.disabled =
                    false;


                calibrateBtn.innerHTML =
                    "🎯 Calibrate Ambient Noise";


            },
            3500
        );

    }
);


// ======================================================
// EXPORT DATA
// ======================================================

exportBtn.addEventListener(
    "click",
    function () {


        if (
            eventLog.length === 0
        ) {


            showToast(
                "No event data to export.",
                "warning"
            );


            return;

        }


        // ==================================================
        // CSV HEADER
        // ==================================================

        let csv =
            "Timestamp,Status,Peak Frequency (Hz),Anomaly Score (%)\n";


        // ==================================================
        // CSV DATA
        // ==================================================

        eventLog.forEach(
            function (event) {


                csv +=
                    `"${event.timestamp}",` +
                    `"${event.status}",` +
                    `${event.peakFreq.toFixed(2)},` +
                    `${event.anomalyScore.toFixed(2)}\n`;

            }
        );


        // ==================================================
        // CREATE FILE
        // ==================================================

        const blob =
            new Blob(
                [csv],
                {
                    type:
                        "text/csv"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            "machine_anomaly_log.csv";


        link.click();


        URL.revokeObjectURL(
            url
        );


        showToast(
            "Event data exported.",
            "success"
        );

    }
);


// ======================================================
// UPTIME
// ======================================================

function updateUptime() {


    const elapsed =
        Date.now() -
        applicationStartTime;


    const totalSeconds =
        Math.floor(
            elapsed / 1000
        );


    const hours =
        Math.floor(
            totalSeconds / 3600
        );


    const minutes =
        Math.floor(
            (totalSeconds % 3600) /
            60
        );


    const seconds =
        totalSeconds % 60;


    uptimeElement.textContent =

        String(hours)
            .padStart(2, "0")

        + ":" +

        String(minutes)
            .padStart(2, "0")

        + ":" +

        String(seconds)
            .padStart(2, "0");

}


setInterval(
    updateUptime,
    1000
);


// ======================================================
// START
// ======================================================

console.log(
    "Acoustic Machine Health Monitor started."
);


console.log(
    "WebSocket:",
    WS_URL
);


connectWebSocket();