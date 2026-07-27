// Funzione per stampare l'ordine sulla stampante termica Bluetooth connessa
async function stampaOrdineSuStampanteTermica(ordine, connectedDevice) {
  console.log(`Stampando per tavolo: ${ordine.tavolo} - Destinazione: ${ordine.destination}`);
  console.log("Piatti:", ordine.items);

  // Controlla di avere un dispositivo Bluetooth connesso
  if (!connectedDevice) {
    console.error("Errore: Stampante Bluetooth non connessa!");
    throw new Error("Stampante non connessa.");
  }

  try {
    // 1. Costruzione dei comandi ESC/POS in stringa
    let textToPrint = "\x1B\x40"; // Inizializza stampante
    textToPrint += "\x1B\x61\x01"; // Centrato
    textToPrint += "--- NAKAI TIKI BAR ---\n";
    textToPrint += `Tavolo: ${ordine.tavolo || "N/D"}\n`;
    textToPrint += `Tipo: ${ordine.type || "COMANDA"}\n`;
    textToPrint += "--------------------------------\n";
    textToPrint += "\x1B\x61\x00"; // Allineato a sinistra

    // Aggiunge gli articoli se presenti nel payload
    if (ordine.items && Array.isArray(ordine.items)) {
      ordine.items.forEach(item => {
        const nome = item.name || item.nome || "Prodotto";
        const qty = item.qty || item.numero || 1;
        textToPrint += `${qty}x ${nome}\n`;
      });
    }

    if (ordine.total) {
      textToPrint += "--------------------------------\n";
      textToPrint += `TOTALE: EUR ${ordine.total}\n`;
    }

    textToPrint += "\n\n\x1B\x69"; // Taglio carta finale

    // 2. Conversione della stringa in Base64 (richiesto da react-native-ble-plx per il metodo writeCharacteristicWithResponseForService)
    // In React Native si usa btoa() o un encoder Base64
    const base64Data = btoa(unescape(encodeURIComponent(textToPrint)));

    // NOTA: Devi sostituire SERVICE_UUID e CHARACTERISTIC_UUID con gli UUID specifici 
    // della tua stampante termica (es. ottenuti tramite discoverAllServicesAndCharacteristics)
    const SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb"; 
    const CHARACTERISTIC_UUID = "00002af1-0000-1000-8000-00805f9b34fb";

    await connectedDevice.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CHARACTERISTIC_UUID,
      base64Data
    );

    console.log("Stampa inviata con successo alla stampante termica!");
    return true;

  } catch (err) {
    console.error("Errore durante la scrittura sulla stampante Bluetooth:", err);
    throw err;
  }
}

