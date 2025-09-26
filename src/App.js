import React, { useState, useEffect } from "react";
import axios from "axios";
/* global NDEFReader */

const API_URL = "https://nfc-reader-backend-6iwh.onrender.com/api";
// const API_URL = "http://localhost:5000";

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
  // Update the NFC initialization code in your useEffect
  useEffect(() => {
    const initNFC = async () => {
      if (!("NDEFReader" in window)) {
        setError("Web NFC is not supported on this device/browser");
        return;
      }

      try {
        const nfc = new NDEFReader();

        // Add a watch for any NFC tag
        await nfc.scan();
        console.log("NFC reader started. Tap any NFC tag.");

        // This will fire when any NFC tag is detected
        nfc.onreading = async (event) => {
          const tagData = {
            timestamp: new Date().toISOString(),
            serialNumber: event.serialNumber || "unknown",
            tagType: "unknown",
            hasNdef: false,
          };

          // Try to get basic tag info
          if (
            event.message &&
            event.message.records &&
            event.message.records.length > 0
          ) {
            tagData.hasNdef = true;
            tagData.recordCount = event.message.records.length;
            tagData.recordTypes = [
              ...new Set(event.message.records.map((r) => r.recordType)),
            ];
          }

          // Try to detect tag type
          if (event.message && event.message.records) {
            // This is an NDEF tag
            tagData.tagType = "NDEF";
          } else {
            // Non-NDEF tag (like your YMCA card)
            tagData.tagType = "Non-NDEF";
          }

          try {
            // Send the tap event to the server
            const response = await axios.post(`${API_URL}/taps`, tagData);
            console.log("Tag tapped:", response.data);
            setTapHistory((prev) => [response.data, ...prev]);
          } catch (err) {
            console.error("Error saving tap:", err);
            setError("Failed to save tap data");
          }
        };

        nfc.onreadingerror = (event) => {
          console.error("NFC read error:", event.message);
          setError(`NFC error: ${event.message}`);
        };
      } catch (err) {
        console.error("Error initializing NFC:", err);
        setError(`Failed to initialize NFC: ${err.message}`);
      }
    };

    initNFC();

    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
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
