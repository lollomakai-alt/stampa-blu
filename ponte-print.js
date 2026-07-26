async function stampaOrdineSuStampanteTermica(ordine) {
  console.log(`Stampando per tavolo: ${ordine.tavolo} - Destinazione: ${ordine.destination}`);
  console.log("Piatti:", ordine.items);

  // Controlla di avere la caratteristica Bluetooth pronta per la scrittura
  if (!window.bluetoothCharacteristic) {
    console.error("Errore: Caratteristica Bluetooth non trovata o stampante non associata correttamente!");
    return;
  }

  try {
    const encoder = new TextEncoder();
    
    // Comandi ESC/POS di base per la stampante termica
    let textToPrint = "\x1B\x40"; // Inizializza stampante
    textToPrint += "\x1B\x61\x01"; // Centrato
    textToPrint += "--- NAKAI TIKI BAR ---\n";
    textToPrint += `Tavolo: ${ordine.tavolo || "N/D"}\n`;
    textToPrint += `Tipo: ${ordine.type || "COMANDA"}\n`;
    textToPrint += "--------------------------------\n";
    textToPrint += "\x1B\x61\x00"; // Allineato a sinistra

    // Aggiunge gli articoli se presenti
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

    // Invia i dati binari alla stampante Bluetooth
    await window.bluetoothCharacteristic.writeValue(encoder.encode(textToPrint));
    console.log("Stampa inviata con successo alla stampante termica!");

  } catch (err) {
    console.error("Errore durante la scrittura sulla stampante Bluetooth:", err);
  }
}
