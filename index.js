(async () => {
  try {
    const { makeWASocket, useMultiFileAuthState, delay, DisconnectReason } = await import("@whiskeysockets/baileys");
    const fs = await import('fs');
    const pino = (await import('pino')).default;
    const rl = (await import("readline")).createInterface({ input: process.stdin, output: process.stdout });

    const question = (text) => new Promise((resolve) => rl.question(text, resolve));

    const reset = "\x1b[0m";
    const green = "\x1b[1;32m";

    const logo = `${green}
    ============================
      Automatic WhatsApp Sender
    ============================
    `;

    const clearScreen = () => {
      console.clear();
      console.log(logo);
    };

    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

    let phoneNumber = null; // मैनुअली एंटर करने के लिए

    async function readInputsFromFile(filePath) {
      try {
        return fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
      } catch (error) {
        console.error(`${green}[!] Error reading file: ${filePath}${reset}`);
        return [];
      }
    }

    async function sendMessages(MznKing, messages, targetNumbers, groupUIDs, haterName, intervalTime) {
      for (let i = 0; i < messages.length; i++) {
        const fullMessage = `${haterName} ${messages[i]}`;
        try {
          if (targetNumbers.length > 0) {
            for (const number of targetNumbers) {
              await MznKing.sendMessage(number + '@c.us', { text: fullMessage });
              console.log(`${green}[✓] Sent to Number: ${number}${reset}`);
            }
          } else {
            for (const group of groupUIDs) {
              await MznKing.sendMessage(group + '@g.us', { text: fullMessage });
              console.log(`${green}[✓] Sent to Group: ${group}${reset}`);
            }
          }
          await delay(intervalTime * 1000);
        } catch (err) {
          console.error(`${green}[!] Error sending message: ${err.message}${reset}`);
        }
      }
    }

    const connectToWhatsApp = async () => {
      const MznKing = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
      });

      if (!MznKing.authState.creds.registered) {
        clearScreen();
        phoneNumber = await question(`${green}[+] Enter Your Phone Number => ${reset}`);
        const pairingCode = await MznKing.requestPairingCode(phoneNumber);
        console.log(`${green}[✓] Pairing Code: ${reset}${pairingCode}`);
        console.log(`${green}[!] Connect your WhatsApp using the pairing code above and restart the script.${reset}`);
        process.exit(0);
      }

      MznKing.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
          clearScreen();
          console.log(`${green}[✓] WhatsApp Connected Successfully!${reset}`);

          const messageFilePath = './messages.txt';
          const numbersFilePath = './numbers.txt';
          const groupsFilePath = './groups.txt';
          const haterFilePath = './hater_name.txt';
          const intervalFilePath = './interval.txt';

          const messages = await readInputsFromFile(messageFilePath);
          const targetNumbers = await readInputsFromFile(numbersFilePath);
          const groupUIDs = await readInputsFromFile(groupsFilePath);
          const haterName = (await readInputsFromFile(haterFilePath))[0] || 'Hater';
          const intervalTime = parseInt((await readInputsFromFile(intervalFilePath))[0], 10) || 5;

          console.log(`${green}[✓] All Inputs Loaded Successfully!${reset}`);
          console.log(`${green}[✓] Sending Messages...${reset}`);
          await sendMessages(MznKing, messages, targetNumbers, groupUIDs, haterName, intervalTime);
        }

        if (connection === "close") {
          const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
            console.log("Reconnecting in 5 seconds...");
            setTimeout(connectToWhatsApp, 5000);
          } else {
            console.log("Connection closed. Please restart the script.");
          }
        }
      });

      MznKing.ev.on('creds.update', saveCreds);
    };

    await connectToWhatsApp();

    process.on('uncaughtException', function (err) {
      console.error('Caught exception:', err);
    });
  } catch (error) {
    console.error("Error importing modules:", error);
  }
})();
