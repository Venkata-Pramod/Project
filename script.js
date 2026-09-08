// ======================================================
// ESP32 CONFIGURATION
// ======================================================

const ESP32_IP = "192.168.1.10";

const WS_URL = `ws://${ESP32_IP}:8080`;


// ======================================================
// HTML ELEMENTS
// ======================================================

const machineStatus =
    document.getElementById("machineStatus");

const statusDescription =
    document.getElementById("statusDescription");

const statusIcon =
    document.getElementById("statusIcon");

const anomalyScore =
    document.getElementById("anomalyScore");

const anomalyBar =
    document.getElementById("anomalyBar");

const peakFreq =
    document.getElementById("peakFreq");

const noiseFloor =
    document.getElementById("noiseFloor");

const sampleRate =
    document.getElementById("sampleRate");

const fftSize =
    document.getElementById("fftSize");

const connectionText =
    document.getElementById("connectionText");

const connectionDot =
    document.getElementById("connectionDot");

const connectionStatus =
    document.getElementById("connectionStatus");

const calibrateBtn =
    document.getElementById("calibrateBtn");


// ======================================================
// CHART
// ======================================================

const ctx =
    document.getElementById("spectrumChart");


const spectrumChart =
    new Chart(ctx, {

        type: "line",

        data: {

            labels: [],

            datasets: [{

                label: "Frequency Spectrum",

                data: [],

                borderWidth: 2,

                pointRadius: 0,

                tension: 0.25,

                fill: true

            }]

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
                        text: "Frequency (Hz)"
                    },

                    ticks: {
                        maxTicksLimit: 10
                    },

                    grid: {
                        display: false
                    }

                },

                y: {

                    title: {
                        display: true,
                        text: "Amplitude"
                    },

                    beginAtZero: true

                }

            }

        }

    });


// ======================================================
// WEBSOCKET
// ======================================================

let socket;


function connectWebSocket() {

    console.log("Connecting to:", WS_URL);

    socket = new WebSocket(WS_URL);


    // ---------------- CONNECTED ----------------

    socket.onopen = function () {

        console.log("WebSocket connected!");

        connectionText.textContent =
            "ESP32 CONNECTED";

        connectionStatus.textContent =
            "Connected";

        connectionDot.style.background =
            "#22c55e";

    };


    // ---------------- MESSAGE ----------------

    socket.onmessage = function (event) {

        try {

            const data =
                JSON.parse(event.data);

            console.log("ESP32:", data);

            updateDashboard(data);

        }

        catch (error) {

            console.error(
                "Invalid ESP32 data:",
                error
            );

        }

    };


    // ---------------- CLOSED ----------------

    socket.onclose = function () {

        console.log(
            "WebSocket disconnected"
        );

        connectionText.textContent =
            "DISCONNECTED";

        connectionStatus.textContent =
            "Disconnected";

        connectionDot.style.background =
            "#ef4444";

        machineStatus.textContent =
            "OFFLINE";

        statusDescription.textContent =
            "Unable to receive data from ESP32.";

        // Try again after 3 seconds

        setTimeout(
            connectWebSocket,
            3000
        );

    };


    // ---------------- ERROR ----------------

    socket.onerror = function (error) {

        console.error(
            "WebSocket error:",
            error
        );

        connectionText.textContent =
            "CONNECTION ERROR";

        connectionDot.style.background =
            "#ef4444";

    };

}


// ======================================================
// UPDATE DASHBOARD
// ======================================================

function updateDashboard(data) {

    // ---------------- STATUS ----------------

    const status =
        data.status || "UNKNOWN";


    machineStatus.textContent =
        status;


    if (status === "HEALTHY") {

        statusDescription.textContent =
            "Machine operating within normal acoustic range.";

        statusIcon.textContent =
            "✓";

    }

    else if (status === "WARNING") {

        statusDescription.textContent =
            "Abnormal acoustic activity detected.";

        statusIcon.textContent =
            "⚠";

    }

    else if (status === "CRITICAL") {

        statusDescription.textContent =
            "Critical anomaly detected. Inspect machine immediately.";

        statusIcon.textContent =
            "!";
    }


    // ---------------- ANOMALY ----------------

    const score =
        Number(data.anomalyScore || 0);


    anomalyScore.textContent =
        score.toFixed(1);


    anomalyBar.style.width =
        Math.min(score, 100) + "%";


    // ---------------- FREQUENCY ----------------

    const frequency =
        Number(data.peakFreq || 0);


    peakFreq.textContent =
        frequency.toFixed(1);


    // ---------------- NOISE ----------------

    const noise =
        Number(data.noiseFloor || 0);


    noiseFloor.textContent =
        noise.toFixed(1);


    // ---------------- SYSTEM ----------------

    if (data.sampleRate) {

        sampleRate.textContent =
            (data.sampleRate / 1000)
            .toFixed(0) + " kHz";

    }


    if (data.fftSize) {

        fftSize.textContent =
            data.fftSize;

    }


    // ---------------- SPECTRUM ----------------

    if (
        data.frequencySpectrum &&
        Array.isArray(data.frequencySpectrum)
    ) {

        updateSpectrum(
            data.frequencySpectrum,
            data.sampleRate || 16000
        );

    }

}


// ======================================================
// UPDATE FFT GRAPH
// ======================================================

function updateSpectrum(
    spectrum,
    samplingRate
) {

    const fftSize =
        spectrum.length * 2;


    const frequencyLabels =
        spectrum.map(
            (_, index) => {

                return (
                    index *
                    samplingRate /
                    fftSize
                ).toFixed(0);

            }
        );


    spectrumChart.data.labels =
        frequencyLabels;


    spectrumChart.data.datasets[0].data =
        spectrum;


    spectrumChart.update();

}


// ======================================================
// CALIBRATION
// ======================================================

calibrateBtn.addEventListener(
    "click",
    function () {

        if (
            !socket ||
            socket.readyState !== WebSocket.OPEN
        ) {

            alert(
                "ESP32 is not connected."
            );

            return;

        }


        const command = {

            command: "calibrate"

        };


        socket.send(
            JSON.stringify(command)
        );


        console.log(
            "Calibration command sent"
        );


        calibrateBtn.textContent =
            "Calibrating...";


        calibrateBtn.disabled =
            true;


        setTimeout(
            function () {

                calibrateBtn.textContent =
                    "⚙ Calibrate System";

                calibrateBtn.disabled =
                    false;

            },
            3500
        );

    }
);


// ======================================================
// START
// ======================================================

connectWebSocket();