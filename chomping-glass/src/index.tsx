import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { ToastContainer } from "react-toastify";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

// Default styles that can be overridden by your app
require("@solana/wallet-adapter-react-ui/styles.css");
require("react-toastify/dist/ReactToastify.css");

const isDevelopment = window.location.hostname === "localhost";
const RPC_TOKEN = process.env.REACT_APP_RPC_TOKEN || "";
const RPC_URL = process.env.REACT_APP_RPC_URL || "";

function Root() {
  return (
    <ConnectionProvider
      endpoint={!isDevelopment ? RPC_URL : `${RPC_URL}${RPC_TOKEN}`}
    >
      <WalletProvider wallets={[new SolflareWalletAdapter()]} autoConnect>
        <WalletModalProvider>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              padding: "10px",
              gap: "10px",
            }}
          >
            <WalletMultiButton />
          </div>
          <div>
            <ToastContainer />
            <App />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
