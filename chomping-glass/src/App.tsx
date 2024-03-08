import { useEffect, useState } from "react";
import "./App.css";
import {
  PartiallyDecodedInstruction,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from "@solana/web3.js";
import Confetti from "react-dom-confetti";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Buffer } from "buffer";
import base58 from "bs58";
import { toast } from "react-toastify";
window.Buffer = Buffer;

const PROGRAM_ID = new PublicKey(
  "63YfDxA8eAD4J3jPMXgpkjRXrycMJo14vTwwMRTEo2aP"
);
const FEE = new PublicKey("CyiBDtLBSdgyJ3itiKPbVajnFkNgPa8YeR86XPr9dJB4");

type GameState = {
  eaten: boolean[][];
};

const compareBoards = (board1: boolean[][], board2: boolean[][]) => {
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 8; j++) {
      if (board1[i][j] !== board2[i][j]) {
        return false;
      }
    }
  }
  return true;
};

const getGameOverState = (win: boolean) => {
  const eaten: boolean[][] = [];
  for (let i = 0; i < 5; i++) {
    eaten.push([]);
    for (let j = 0; j < 8; j++) {
      eaten[i].push(true);
    }
  }
  if (!win) {
    eaten[4][7] = false;
  }
  return { eaten };
};

const toBooleanArray = (num: number) => {
  // convert to binary string, num will always be < 256
  const binaryString = num.toString(2);
  // pad with 0s to make sure it's 8 bits long
  const paddedBinaryString = binaryString.padStart(8, "0");
  // split into array of 1s and 0s
  const binaryArray = paddedBinaryString.split("");
  // convert to boolean array
  return binaryArray.map((char) => char === "1");
};

const getRow = (index: number) => {
  return Math.floor(index / 8);
};

const getCol = (index: number) => {
  return index % 8;
};

const getIndex = (row: number, col: number) => {
  return row * 8 + col;
};

function Popup({
  text,
  isOpen,
  onClose,
}: {
  text: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "5px",
          textAlign: "center",
        }}
      >
        <h1>{text}</h1>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
const notify = (text: string, link?: string, linkText?: string) => {
  toast(
    <div>
      {text}
      {link && linkText && (
        <>
          <br />{" "}
          <a href={link} target="_blank" rel="noopener noreferrer">
            {linkText}
          </a>
        </>
      )}
    </div>,
    {
      position: "bottom-left",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: false,
      progress: undefined,
    }
  );
};

function App() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);
  const [isPopupOpen, setPopupOpen] = useState(false);
  const [popupText, setPopupText] = useState("");
  const [moveHistory, setMoveHistory] = useState<number[]>([]);
  const [opponentMoveHistory, setOpponentMoveHistory] = useState<number[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);

  const confettiConfig = {
    angle: 270,
    spread: 360,
    startVelocity: 30,
    elementCount: 150,
    dragFriction: 0.12,
    duration: 3000,
    stagger: 3,
    width: "12px",
    height: "12px",
    perspective: "500px",
    colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"],
  };

  const reset = () => {
    setPopupOpen(false);
    setPopupText("");
    setGameState(null);
    setMoveHistory([]);
    setOpponentMoveHistory([]);
  };

  const getInstruction = (cmd: number): TransactionInstruction => {
    return {
      programId: PROGRAM_ID,
      keys: [
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: wallet.publicKey!,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: PublicKey.findProgramAddressSync(
            [wallet.publicKey!.toBuffer()],
            PROGRAM_ID
          )[0],
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: FEE,
          isSigner: false,
          isWritable: true,
        },
      ],
      data: Buffer.from([cmd]),
    };
  };

  const handleClick = async (index: number) => {
    if (!wallet.connected) {
      return;
    }
    setClickedIndex(index);
    const row = getRow(index) + 1;
    const col = getCol(index) + 1;
    const instruction = getInstruction((row << 4) | col);
    const transaction = new Transaction().add(instruction);
    let signature: TransactionSignature;
    try {
      signature = await wallet.sendTransaction(transaction, connection, {
        skipPreflight: true,
      });
    } catch (e) {
      setClickedIndex(null);
      console.error(e);
      return;
    }
    console.log("TXID:", signature);
    if (connection.rpcEndpoint.includes("localhost")) {
      console.log(
        `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`
      );
    } else {
      console.log(`https://solscan.io/tx/${signature}`);
    }
else if (connection.rpcEndpoint.includes("eclipsenetwork")) {
    console.log(
        `https://solscan.io/tx/${signature}?cluster=custom&customUrl=https%3A%2F%2Fstaging-rpc.dev2.eclipsenetwork.xyz`
    );
}
    await connection
      .confirmTransaction(signature, "confirmed")
      .then(async () => {
        let tx = await connection.getParsedTransaction(signature);
        for (let i = 0; i < 5; i++) {
          tx = await connection.getParsedTransaction(signature);
          if (tx) {
            break;
          }
        }
        const ix = tx?.transaction.message.instructions.filter((x) =>
          x.programId.equals(PROGRAM_ID)
        );

        if (ix?.length && ix.length > 0) {
          const data = base58.decode(
            (ix[0] as PartiallyDecodedInstruction).data
          )[0];
          const row = (data >> 4) - 1;
          const col = (data & 0xf) - 1;
          setMoveHistory([...moveHistory, getIndex(row, col)]);
        }
        if (tx?.meta?.logMessages) {
          for (const message of tx.meta.logMessages) {
            if (message.includes("Opponent Move:")) {
              const row = parseInt(message.split(" ")[4]) - 1;
              const col = parseInt(message.split(" ")[5]) - 1;
              setOpponentMoveHistory([
                ...opponentMoveHistory,
                getIndex(row, col),
              ]);
            } else if (message.includes("You lose!")) {
              setGameState(getGameOverState(false));
              setPopupText("You Lose!");
              setPopupOpen(true);
              break;
            } else if (message.includes("You win!")) {
              setGameState(getGameOverState(true));
              setPopupText("You win!");
              setPopupOpen(true);
              break;
            }
          }
          notify(
            `${signature}`,
            `https://solscan.io/tx/${signature}`,
            "View on Solscan"
          );
        } else {
          console.error("No log messages found for transaction", signature);
        }
      })
      .catch((e) => {
        console.error(e);
      });
    setClickedIndex(null);
  };

  const handleForfeit = async () => {
    if (!wallet.connected) {
      return;
    }
    const instruction = getInstruction(0);
    const transaction = new Transaction().add(instruction);
    let signature: TransactionSignature;
    try {
      signature = await wallet.sendTransaction(transaction, connection, {
        skipPreflight: true,
      });
    } catch (e) {
      console.error(e);
      return;
    }
    await connection
      .confirmTransaction(signature, "confirmed")
      .then(async () => {
        reset();
      })
      .catch((e) => {
        window.location.reload();
      });
  };

  useEffect(() => {
    reset();
  }, [wallet.connected, wallet.publicKey, connection]);

  useEffect(() => {
    if (!wallet.publicKey) {
      return;
    }
    if (!wallet.connected) {
      return;
    }
    const [gameKey] = PublicKey.findProgramAddressSync(
      [wallet.publicKey.toBuffer()],
      PROGRAM_ID
    );

    let prevBoard: boolean[][];
    let subId = -1;
    const streamGame = async () => {
      try {
        const account = await connection.getAccountInfo(gameKey, "confirmed");
        if (account?.data) {
          if (account.data.length === 0) {
            return;
          }
          const board: boolean[][] = [];
          account.data.slice(0, 5).forEach((x) => {
            board.push(toBooleanArray(x));
          });
          if (!prevBoard || !compareBoards(board, prevBoard || [])) {
            setGameState({ eaten: board });
            prevBoard = board;
          }
        }
      } catch (e) {}

      subId = connection.onAccountChange(
        gameKey,
        (result) => {
          if (result && result.data) {
            try {
              if (result.data.length === 0) {
                return;
              }
              const board: boolean[][] = [];
              result.data.slice(0, 5).forEach((x) => {
                board.push(toBooleanArray(x));
              });
              if (!prevBoard || !compareBoards(board, prevBoard || [])) {
                setGameState({ eaten: board });
                prevBoard = board;
              }
            } catch (e) {
              return;
            }
          }
        },
        "confirmed"
      );
    };
    streamGame();
    // create a polling loop to fetch the game state
    const interval = setInterval(async () => {
      try {
        const account = await connection.getAccountInfo(gameKey, "confirmed");
        if (account?.data) {
          if (account.data.length === 0) {
            return;
          }
          const board: boolean[][] = [];
          account.data.slice(0, 5).forEach((x) => {
            board.push(toBooleanArray(x));
          });
          if (!prevBoard || !compareBoards(board, prevBoard || [])) {
            setGameState({ eaten: board });
            prevBoard = board;
          }
        }
      } catch (e) {
        return;
      }
    }, 1000);

    return () => {
      if (subId >= 0) {
        connection.removeAccountChangeListener(subId);
      }
      clearInterval(interval);
    };
  }, [wallet.connected, wallet.publicKey, connection]);

  return (
    <div>
      <h1 style={{ display: "flex", justifyContent: "center" }}>
        Chomping Glass
      </h1>
      <div
        style={{ display: "flex", padding: "5px", justifyContent: "center" }}
      >
        The goal of this game is to outsmart your opponent and take the last
        piece of real candy.
      </div>
      <div
        style={{ display: "flex", padding: "5px", justifyContent: "center" }}
      >
        Clicking the candy on a selected square will initiate a transaction.
      </div>
      <div
        style={{ display: "flex", padding: "5px", justifyContent: "center" }}
      >
        By confirming, you agree to eat the selected candy and all the candy to
        the left and above it.
      </div>

      <div
        style={{ display: "flex", padding: "5px", justifyContent: "center" }}
      >
        The square on the bottom right corner is not candy though—it's glass!
      </div>
      <div
        style={{ display: "flex", padding: "5px", justifyContent: "center" }}
      >
        The player who is forced to eat the glass loses.
      </div>
      <div
        style={{ display: "flex", padding: "5px", justifyContent: "center" }}
      >
        Players alternate moves, and you will be playing against the on-chain AI
        🤖.
      </div>
      <div
        style={{ display: "flex", padding: "5px", justifyContent: "center" }}
      >
        Your moves will be numbered and displayed in&nbsp;
        <span style={{ color: "blue" }}>blue</span>
      </div>
      <div
        style={{ display: "flex", padding: "5px", justifyContent: "center" }}
      >
        The AI's moves will be numbered and displayed in&nbsp;
        <span style={{ color: "red" }}>red</span>
      </div>
      <div
        style={{
          display: "flex",
          fontWeight: "bold",
          padding: "15px",
          justifyContent: "center",
        }}
      >
        The AI is tricky to beat, but it is possible!
      </div>
      <div
        style={{ display: "flex", padding: "5px", justifyContent: "center" }}
      >
        Each game requires a deposit of 0.001◎ (SOL) to play.
      </div>
      <div
        style={{ display: "flex", padding: "5px", justifyContent: "center" }}
      >
        If you win, the initial deposit will be refunded to your wallet.
      </div>
      <div
        style={{
          display: "flex",
          paddingTop: "5px",
          paddingBottom: "25px",
          justifyContent: "center",
        }}
      >
        The deposit is collected after making the first move.
      </div>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            zIndex: 10,
          }}
        >
          <div
            style={{
              position: "fixed",
              top: "20%",
              left: "50%",
              transform: "translateX(-50%)",
            }}
          >
            <Confetti
              active={popupText === "You win!"}
              config={confettiConfig}
            />
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(8, 50px)",
            gridTemplateRows: "repeat(5, 50px)",
            gap: "2px",
            justifyContent: "center",
            alignItems: "center",
            margin: "0 auto",
          }}
        >
          {Array.from({ length: 40 }, (_, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "50px",
                height: "50px",
                border: "1px solid #000",
                fontSize: "2rem",
                cursor:
                  index === 39
                    ? "default"
                    : wallet.connected &&
                      !gameState?.eaten[getRow(index)][getCol(index)]
                    ? "pointer"
                    : "not-allowed",
                backgroundColor: gameState?.eaten[getRow(index)][getCol(index)]
                  ? "gray"
                  : (hoverIndex !== null &&
                      getRow(index) <= getRow(hoverIndex) &&
                      getCol(index) <= getCol(hoverIndex) &&
                      index !== 39) ||
                    index === clickedIndex
                  ? "#FFD700"
                  : "transparent",
              }}
              onMouseEnter={() => {
                if (index !== 39) setHoverIndex(index);
              }}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={
                wallet.connected &&
                !gameState?.eaten[getRow(index)][getCol(index)] &&
                index !== 39
                  ? () => handleClick(index)
                  : undefined
              }
            >
              {moveHistory.includes(index) ? (
                <div style={{ color: "blue" }}>
                  {moveHistory.indexOf(index) + 1}
                </div>
              ) : opponentMoveHistory.includes(index) ? (
                <div style={{ color: "red" }}>
                  {opponentMoveHistory.indexOf(index) + 1}
                </div>
              ) : gameState?.eaten[getRow(index)][getCol(index)] ? (
                ""
              ) : index === 39 ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    alignContent: "center",
                  }}
                >
                  <img
                    src={`https://www.chompingglass.com/glass.png`}
                    alt="glass"
                    style={{
                      width: "80%",
                      height: "80%",
                    }}
                  />
                </div>
              ) : (
                "🍬"
              )}
            </div>
          ))}

          {popupText !== "" && (
            <Popup
              text={popupText}
              isOpen={isPopupOpen}
              onClose={() => {
                reset();
              }}
            />
          )}
        </div>
        {wallet.publicKey &&
          gameState &&
          gameState.eaten.flat().some((x) => x) && (
            <button onClick={handleForfeit} style={{ marginTop: "20px" }}>
              Give Up
            </button>
          )}
      </div>
    </div>
  );
}

export default App;
