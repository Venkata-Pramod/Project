// ================================================================
// ACOUSTIC MACHINE HEALTH MONITOR
// Browser Dashboard Controller
// ================================================================


// ================================================================
// ESP32 IP
// ================================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );


const ipFromURL =
    (
        urlParams.get("esp32") ||
        ""
    ).trim();


const savedESP32IP =
    (
        localStorage.getItem(
            "esp32_ip"
        ) ||
        ""
    ).trim();


const DEFAULT_ESP32_IP =
    "10.92.53.66";


if (ipFromURL) {

    localStorage.setItem(
        "esp32_ip",
        ipFromURL
    );
}


const ESP32_IP =
    ipFromURL ||
    savedESP32IP ||
    DEFAULT_ESP32_IP;


const WS_URL =
    `ws://${ESP32_IP}:8080`;


const MAX_FREQUENCY_HZ =
    8000;


// ================================================================
// HTML ELEMENTS
// ================================================================

const connectionDot =
    document.getElementById(
        "connectionDot"
    );


const connectionText =
    document.getElementById(
        "connectionText"
    );


const statusBadge =
    document.getElementById(
        "statusBadge"
    );


const statusText =
    document.getElementById(
        "statusText"
    );


const statusDescription =
    document.getElementById(
        "statusDescription"
    );


const peakFrequency =
    document.getElementById(
        "peakFrequency"
    );


const maxFrequency =
    document.getElementById(
        "maxFrequency"
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


const debugFrequencyLimit =
    document.getElementById(
        "debugFrequencyLimit"
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


const chartCanvas =
    document.getElementById(
        "frequencyChart"
    );


// ================================================================
// VARIABLES
// ================================================================

let socket =
    null;


let reconnectTimer =
    null;


let reconnectDelay =
    2000;


let connectionGeneration =
    0;


let toastTimer =
    null;


let previousStatus =
    "UNKNOWN";


let eventLog =
    [];


let calibrationButtonTimer =
    null;


const applicationStartTime =
    Date.now();


wsUrl.textContent =
    WS_URL;


// ================================================================
// CHART
// ================================================================

const frequencyChart =
    new Chart(
        chartCanvas,
        {

            type:
                "line",

            data: {

                datasets: [

                    {

                        label:
                            "Frequency Spectrum",

                        data:
                            [],

                        borderWidth:
                            2,

                        pointRadius:
                            0,

                        tension:
                            0.2,

                        fill:
                            true,

                        borderColor:
                            "#3498db",

                        backgroundColor:
                            "rgba(52, 152, 219, 0.12)"
                    }
                ]
            },


            options: {

                responsive:
                    true,

                maintainAspectRatio:
                    false,

                animation:
                    false,

                interaction: {

                    intersect:
                        false
                },


                plugins: {

                    legend: {

                        display:
                            false
                    }
                },


                scales: {

                    x: {

                        type:
                            "linear",

                        min:
                            0,

                        max:
                            MAX_FREQUENCY_HZ,

                        title: {

                            display:
                                true,

                            text:
                                "Frequency (Hz)"
                        },

                        ticks: {

                            stepSize:
                                1000,

                            callback:
                                function(value) {

                                    return (
                                        value.toLocaleString()
                                    );
                                }
                        }
                    },


                    y: {

                        beginAtZero:
                            true,

                        title: {

                            display:
                                true,

                            text:
                                "Amplitude"
                        }
                    }
                }
            }
        }
    );


// ================================================================
// WEBSOCKET CONNECTION
// ================================================================

function connectWebSocket() {


    // Do not create another connection
    // if one is already connecting or open.

    if (
        socket &&
        (
            socket.readyState ===
            WebSocket.CONNECTING ||

            socket.readyState ===
            WebSocket.OPEN
        )
    ) {

        return;
    }


    const generation =
        ++connectionGeneration;


    clearTimeout(
        reconnectTimer
    );


    reconnectTimer =
        null;


    connectionText.textContent =
        "Connecting...";


    connectionDot.className =
        "status-dot connecting";


    let newSocket;


    try {

        newSocket =
            new WebSocket(
                WS_URL
            );

    } catch (error) {

        console.error(
            "WebSocket creation failed:",
            error
        );

        scheduleReconnect();

        return;
    }


    socket =
        newSocket;


    newSocket.onopen =
        function() {


            if (
                generation !==
                connectionGeneration
            ) {

                return;
            }


            reconnectDelay =
                2000;


            connectionText.textContent =
                "ESP32 Connected";


            connectionDot.className =
                "status-dot connected";


            showToast(
                "ESP32 connected successfully.",
                "success"
            );
        };


    newSocket.onmessage =
        function(event) {


            if (
                generation !==
                connectionGeneration
            ) {

                return;
            }


            try {

                const data =
                    JSON.parse(
                        event.data
                    );


                updateDashboard(
                    data
                );

            } catch (error) {

                console.error(
                    "Invalid JSON from ESP32:",
                    error
                );
            }
        };


    newSocket.onerror =
        function(error) {


            if (
                generation !==
                connectionGeneration
            ) {

                return;
            }


            console.error(
                "WebSocket error:",
                error
            );


            connectionText.textContent =
                "Connection Error";


            connectionDot.className =
                "status-dot disconnected";
        };


    newSocket.onclose =
        function() {


            if (
                generation !==
                connectionGeneration
            ) {

                return;
            }


            socket =
                null;


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


            previousStatus =
                "UNKNOWN";


            scheduleReconnect();
        };
}


// ================================================================
// RECONNECT
// ================================================================

function scheduleReconnect() {


    if (
        reconnectTimer !==
        null
    ) {

        return;
    }


    const delay =
        reconnectDelay;


    reconnectTimer =
        setTimeout(
            function() {


                reconnectTimer =
                    null;


                connectWebSocket();


                reconnectDelay =
                    Math.min(
                        reconnectDelay * 1.5,
                        10000
                    );

            },
            delay
        );
}


// ================================================================
// DASHBOARD UPDATE
// ================================================================

function updateDashboard(data) {


    const status =
        String(
            data.status ||
            "UNKNOWN"
        ).toUpperCase();


    // ------------------------------------------------------------
    // CRITICAL EVENT
    // ------------------------------------------------------------

    if (

        status ===
            "CRITICAL" &&

        previousStatus !==
            "CRITICAL"

    ) {

        handleCriticalEvent(
            data
        );
    }


    previousStatus =
        status;


    // ------------------------------------------------------------
    // STATUS
    // ------------------------------------------------------------

    updateStatus(
        status
    );


    // ------------------------------------------------------------
    // PEAK FREQUENCY
    // ------------------------------------------------------------

    const frequency =
        Number(
            data.peakFreq
        );


    if (
        Number.isFinite(
            frequency
        )
    ) {

        peakFrequency.textContent =
            frequency.toFixed(1);

    } else {

        peakFrequency.textContent =
            "--";
    }


    // ------------------------------------------------------------
    // ANOMALY SCORE
    // ------------------------------------------------------------

    const score =
        Number(
            data.anomalyScore
        );


    anomalyScore.textContent =

        Number.isFinite(
            score
        )

            ? score.toFixed(1)

            : "0.0";


    // ------------------------------------------------------------
    // CALIBRATED FREQUENCY LIMIT
    // ------------------------------------------------------------

    const frequencyLimit =
        Number(
            data.frequencyLimit
        );


    const calibrationState =
        String(
            data.calibration ||
            ""
        ).toLowerCase();


    if (
        calibrationState ===
        "running"
    ) {

        maxFrequency.textContent =
            "...";

        debugFrequencyLimit.textContent =
            "Calibrating";


    } else if (

        Number.isFinite(
            frequencyLimit
        ) &&

        frequencyLimit > 0

    ) {

        maxFrequency.textContent =
            frequencyLimit.toFixed(1);

        debugFrequencyLimit.textContent =
            frequencyLimit.toFixed(1);


    } else {

        maxFrequency.textContent =
            "--";

        debugFrequencyLimit.textContent =
            "Not calibrated";
    }


    // ------------------------------------------------------------
    // FRICTION ENERGY
    // ------------------------------------------------------------

    const energy =
        Number(
            data.frictionEnergy
        );


    frictionEnergy.textContent =

        Number.isFinite(
            energy
        )

            ? energy.toFixed(2)

            : "--";


    // ------------------------------------------------------------
    // SAMPLE RATE
    // ------------------------------------------------------------

    if (
        data.sampleRate !==
        undefined
    ) {

        sampleRate.textContent =
            data.sampleRate;
    }


    // ------------------------------------------------------------
    // FFT SIZE
    // ------------------------------------------------------------

    if (
        data.fftSize !==
        undefined
    ) {

        fftSize.textContent =
            data.fftSize;
    }


    // ------------------------------------------------------------
    // FRICTION THRESHOLD
    // ------------------------------------------------------------

    if (
        data.frictionThreshold !==
        undefined
    ) {

        const threshold =
            Number(
                data.frictionThreshold
            );


        frictionThreshold.textContent =

            Number.isFinite(
                threshold
            )

                ? threshold.toFixed(2)

                : "--";
    }


    // ------------------------------------------------------------
    // CALIBRATION
    // ------------------------------------------------------------

    if (
        data.calibration !==
        undefined
    ) {

        calibrationStatus.textContent =
            data.calibration;
    }


    // ------------------------------------------------------------
    // LAST UPDATE
    // ------------------------------------------------------------

    lastUpdate.textContent =
        new Date().toLocaleTimeString();


    // ------------------------------------------------------------
    // SPECTRUM
    // ------------------------------------------------------------

    if (
        Array.isArray(
            data.frequencySpectrum
        )
    ) {

        updateSpectrum(

            data.frequencySpectrum,

            Number(
                data.sampleRate
            ) || 16000,

            status
        );
    }
}


// ================================================================
// STATUS
// ================================================================

function updateStatus(status) {


    statusBadge.classList.remove(
        "healthy",
        "warning",
        "critical"
    );


    if (
        status ===
        "HEALTHY"
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


    } else if (
        status ===
        "WARNING"
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


    } else if (
        status ===
        "CRITICAL"
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


    } else {

        statusText.textContent =
            status;


        statusDescription.textContent =
            "Waiting for valid machine status.";
    }
}


// ================================================================
// SPECTRUM
// ================================================================

function updateSpectrum(
    spectrum,
    samplingRate,
    status
) {


    if (
        !Array.isArray(
            spectrum
        ) ||

        spectrum.length ===
        0
    ) {

        return;
    }


    const fftSizeValue =
        spectrum.length * 2;


    const points =
        spectrum.map(
            function(
                amplitude,
                index
            ) {


                const frequency =

                    (
                        index *
                        samplingRate
                    ) /
                    fftSizeValue;


                return {

                    x:
                        frequency,

                    y:
                        Number(
                            amplitude
                        ) || 0
                };
            }
        );


    frequencyChart
        .data
        .datasets[0]
        .data =
        points;


    // FIXED 0-8000 Hz AXIS

    frequencyChart
        .options
        .scales
        .x
        .min =
        0;


    frequencyChart
        .options
        .scales
        .x
        .max =
        MAX_FREQUENCY_HZ;


    // COLOR

    if (
        status ===
        "CRITICAL"
    ) {


        frequencyChart
            .data
            .datasets[0]
            .borderColor =
            "#e74c3c";


        frequencyChart
            .data
            .datasets[0]
            .backgroundColor =
            "rgba(231, 76, 60, 0.20)";


        chartSection.classList.add(
            "critical"
        );


    } else {


        frequencyChart
            .data
            .datasets[0]
            .borderColor =
            "#3498db";


        frequencyChart
            .data
            .datasets[0]
            .backgroundColor =
            "rgba(52, 152, 219, 0.12)";


        chartSection.classList.remove(
            "critical"
        );
    }


    frequencyChart.update(
        "none"
    );
}


// ================================================================
// CRITICAL EVENT
// ================================================================

function handleCriticalEvent(data) {


    const now =
        new Date();


    eventLog.push(
        {

            timestamp:
                now.toLocaleString(),

            status:
                "CRITICAL",

            peakFreq:
                Number(
                    data.peakFreq
                ) || 0,

            anomalyScore:
                Number(
                    data.anomalyScore
                ) || 0,

            spectralDifference:
                Number(
                    data.spectralDifference
                ) || 0
        }
    );


    renderEventLog();


    showToast(
        "🚨 CRITICAL — Machine condition detected.",
        "critical"
    );
}


// ================================================================
// TOAST
// ================================================================

function showToast(
    message,
    type
) {


    clearTimeout(
        toastTimer
    );


    toast.textContent =
        message;


    toast.className =
        `toast show ${type || ""}`;


    toastTimer =
        setTimeout(
            function() {

                toast.classList.remove(
                    "show"
                );

            },
            5000
        );
}


// ================================================================
// EVENT LOG
// ================================================================

function renderEventLog() {


    const search =
        filterInput
            .value
            .toLowerCase()
            .trim();


    const level =
        filterLevel
            .value
            .toLowerCase();


    const filteredEvents =
        eventLog.filter(
            function(event) {


                const searchMatch =

                    event.timestamp
                        .toLowerCase()
                        .includes(
                            search
                        )

                    ||

                    event.status
                        .toLowerCase()
                        .includes(
                            search
                        );


                const levelMatch =

                    level === "" ||

                    event.status
                        .toLowerCase() ===
                    level;


                return (

                    searchMatch &&

                    levelMatch

                );
            }
        );


    if (
        filteredEvents.length ===
        0
    ) {


        eventLogBody.innerHTML =
            `
            <tr class="empty-row">

                <td colspan="5">

                    No matching events found.

                </td>

            </tr>
            `;


    } else {


        eventLogBody.innerHTML =
            "";


        filteredEvents
            .slice()
            .reverse()
            .forEach(
                function(event) {


                    const row =
                        document.createElement(
                            "tr"
                        );


                    row.innerHTML =
                        `
                        <td>
                            ${escapeHtml(
                                event.timestamp
                            )}
                        </td>

                        <td>

                            <span
                                class="status-badge-small critical">

                                CRITICAL

                            </span>

                        </td>

                        <td>
                            ${event.peakFreq.toFixed(1)}
                        </td>

                        <td>
                            ${event.anomalyScore.toFixed(1)}
                        </td>

                        <td>
                            Telegram Alert
                        </td>
                        `;


                    eventLogBody.appendChild(
                        row
                    );
                }
            );
    }


    totalEvents.textContent =
        eventLog.length;


    criticalCount.textContent =
        eventLog.filter(
            function(event) {

                return (
                    event.status ===
                    "CRITICAL"
                );
            }
        ).length;
}


// ================================================================
// ESCAPE HTML
// ================================================================

function escapeHtml(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


// ================================================================
// RESET LOG
// ================================================================

resetBtn.addEventListener(
    "click",
    function() {


        eventLog =
            [];


        renderEventLog();


        showToast(
            "Event log cleared.",
            "success"
        );
    }
);


// ================================================================
// FILTER
// ================================================================

filterInput.addEventListener(
    "input",
    renderEventLog
);


filterLevel.addEventListener(
    "change",
    renderEventLog
);


// ================================================================
// EXPORT
// ================================================================

exportBtn.addEventListener(
    "click",
    function() {


        if (
            eventLog.length ===
            0
        ) {


            showToast(
                "There are no events to export.",
                "warning"
            );


            return;
        }


        const rows =
            [

                [

                    "Timestamp",

                    "Status",

                    "Peak Frequency (Hz)",

                    "Anomaly Score (%)",

                    "Spectral Difference (%)"

                ]

            ];


        eventLog.forEach(
            function(event) {


                rows.push(
                    [

                        event.timestamp,

                        event.status,

                        event.peakFreq.toFixed(
                            1
                        ),

                        event.anomalyScore.toFixed(
                            1
                        ),

                        event.spectralDifference.toFixed(
                            1
                        )

                    ]
                );
            }
        );


        const csv =
            rows
                .map(
                    function(row) {


                        return row
                            .map(
                                function(value) {


                                    return (

                                        `"${String(value)
                                            .replace(
                                                /"/g,
                                                '""'
                                            )}"`

                                    );
                                }
                            )
                            .join(",");
                    }
                )
                .join("\n");


        const blob =
            new Blob(

                [csv],

                {
                    type:
                        "text/csv;charset=utf-8"
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


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );


        showToast(
            "Event data exported.",
            "success"
        );
    }
);


// ================================================================
// CALIBRATION
// ================================================================

calibrateBtn.addEventListener(
    "click",
    function() {


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


        if (
            calibrateBtn.disabled
        ) {

            return;
        }


        try {

            socket.send(

                JSON.stringify(
                    {
                        command:
                            "calibrate"
                    }
                )

            );

        } catch (error) {


            console.error(
                "Calibration command failed:",
                error
            );


            showToast(
                "Failed to send calibration command.",
                "error"
            );


            return;
        }


        calibrateBtn.disabled =
            true;


        calibrateBtn.innerHTML =
            "⏳ Calibrating...";


        calibrationStatus.textContent =
            "Running";


        maxFrequency.textContent =
            "...";


        debugFrequencyLimit.textContent =
            "Calibrating";


        showToast(
            "Calibration started. Keep the machine running normally for 3 seconds.",
            "warning"
        );


        clearTimeout(
            calibrationButtonTimer
        );


        calibrationButtonTimer =
            setTimeout(
                function() {


                    calibrateBtn.disabled =
                        false;


                    calibrateBtn.innerHTML =
                        "🎯 Recalibrate Machine Frequency";


                },
                4000
            );
    }
);


// ================================================================
// UPTIME
// ================================================================

function updateUptime() {


    const elapsed =
        Date.now() -
        applicationStartTime;


    const totalSeconds =
        Math.floor(
            elapsed /
            1000
        );


    const hours =
        Math.floor(
            totalSeconds /
            3600
        );


    const minutes =
        Math.floor(

            (
                totalSeconds %
                3600

            ) /

            60

        );


    const seconds =
        totalSeconds %
        60;


    uptimeElement.textContent =

        String(hours)
            .padStart(
                2,
                "0"
            )

        +

        ":"

        +

        String(minutes)
            .padStart(
                2,
                "0"
            )

        +

        ":"

        +

        String(seconds)
            .padStart(
                2,
                "0"
            );
}


setInterval(
    updateUptime,
    1000
);


updateUptime();


renderEventLog();


// ================================================================
// INITIAL CONNECTION
// ================================================================

connectWebSocket();


// ================================================================
// CONSOLE
// ================================================================

console.log(
    "Acoustic Machine Health Monitor started."
);


console.log(
    "WebSocket:",
    WS_URL
);


console.log(
    "WebSocket watchdog disabled."
);


console.log(
    "Only one WebSocket connection is allowed at a time."
);


console.log(
    "Use ?esp32=IP if the ESP32 IP changes."
);
