import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "https://nfc-reader-backend-6iwh.onrender.com";

function App() {
  const [tapHistory, setTapHistory] = useState([]);
  const [error, setError] = useState("");

  // Load tap history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await axios.get(`${API_URL}/taps`);
        setTapHistory(response.data);
      } catch (err) {
        console.error("Error loading tap history:", err);
        setError("Failed to load tap history");
      }
    };

    loadHistory();
  }, []);

  // Initialize NFC reading
  useEffect(() => {
    if ("NDEFReader" in window) {
      const nfc = new NDEFReader();

      const startNFC = async () => {
        try {
          await nfc.scan();
          console.log("NFC reader started. Tap a tag to scan.");

          nfc.onreading = async (event) => {
            const message = event.message;
            const records = [];

            for (const record of message.records) {
              let data;
              if (record.recordType === "text") {
                const textDecoder = new TextDecoder(record.encoding);
                data = textDecoder.decode(record.data);
              } else if (record.recordType === "url") {
                const textDecoder = new TextDecoder();
                data = textDecoder.decode(record.data);
              } else {
                data = Array.from(record.data, (b) =>
                  b.toString(16).padStart(2, "0")
                ).join(":");
              }

              records.push({
                recordType: record.recordType,
                data: data,
                mediaType: record.mediaType,
              });
            }

            try {
              const response = await axios.post(`${API_URL}/taps`, {
                records,
                serialNumber: event.serialNumber || "unknown",
              });
              setTapHistory((prev) => [response.data, ...prev]);
            } catch (err) {
              console.error("Error saving tap:", err);
              setError("Failed to save tap data");
            }
          };

          nfc.onreadingerror = (event) => {
            console.error("NFC read error:", event.message);
            setError(`NFC read error: ${event.message}`);
          };
        } catch (err) {
          console.error("Error initializing NFC:", err);
          setError("NFC is not supported or permission denied");
        }
      };

      startNFC();
    } else {
      setError("Web NFC is not supported on this device/browser");
    }
  }, []);

  return (
    <div
      className="App"
      style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}
    >
      <h1>NFC Tap Logger</h1>

      {error && <div style={{ color: "red", margin: "10px 0" }}>{error}</div>}

      <div style={{ margin: "20px 0" }}>
        <h2>Tap an NFC tag to log it</h2>
        <p>Make sure NFC is enabled on your device</p>
      </div>

      <div>
        <h3>Tap History</h3>
        {tapHistory.length === 0 ? (
          <p>No taps recorded yet</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {tapHistory.map((tap, index) => (
              <li
                key={index}
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  margin: "5px 0",
                  borderRadius: "4px",
                }}
              >
                <div>
                  <strong>Time:</strong>{" "}
                  {new Date(tap.timestamp).toLocaleString()}
                </div>
                <div>
                  <strong>Tag ID:</strong> {tap.serialNumber}
                </div>
                {tap.records && tap.records.length > 0 && (
                  <div style={{ marginTop: "5px" }}>
                    <strong>Data:</strong>
                    <pre
                      style={{
                        background: "#f5f5f5",
                        padding: "5px",
                        borderRadius: "3px",
                        overflowX: "auto",
                      }}
                    >
                      {JSON.stringify(tap.records, null, 2)}
                    </pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
