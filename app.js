// Inizializza qui il client Supabase (assicurati di avere importato la libreria o lo script di Supabase in index.html)
const SUPABASE_URL = 'https://yyrawuynqukwszvotiuu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5pTXjGcknQWzbVDWwD4tSQ_trCjQV0b';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let bluetoothDevice = null;

// 1. Funzione per connettere la stampante termica Bluetooth dal browser
async function connettiStampante() {
  try {
    console.log("Apertura ricerca dispositivi Bluetooth...");
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"] // Sostituisci o aggiungi gli UUID della tua stampante se necessario
    });

    console.log(`Dispositivo selezionato: ${bluetoothDevice.name}`);
    
    // Gestione disconnessione
    bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

    // Connessione GATT
    const server = await bluetoothDevice.gatt.connect();
    console.log("Stampante Bluetooth connessa con successo!");
    
    // Aggiorna l'interfaccia se hai un elemento visivo
    document.getElementById("status-connessione").innerText = "Stampante Connessa: " + bluetoothDevice.name;

  } catch (error) {
    console.error("Errore/Annullato:", error);
    alert("Errore di connessione Bluetooth: " + error.message);
  }
}

function onDisconnected(event) {
  console.log(`Dispositivo disconnesso: ${event.target.name}`);
  bluetoothDevice = null;
  document.getElementById("status-connessione").innerText = "In attesa di associazione Bluetooth...";
}

// 2. Funzione per pescare da Supabase e stampare
async function stampaUltimoOrdineDaSupabase() {
  try {
    console.log("Recupero ordine da Supabase...");
    
    // Esempio: legge l'ultimo ordine inserito nella tabella 'ordini'
    const { data, error } = await supabaseClient
      .from('ordini')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log("Nessun ordine trovato su Supabase.");
      return;
    }

    const ultimoOrdine = data[0];
    console.log("Ordine trovato:", ultimoOrdine);

    // Esegue la stampa fisica
    await stampaOrdineSuStampanteTermica(ultimoOrdine, bluetoothDevice);

  } catch (err) {
    console.error("Errore nel recupero o stampa da Supabase:", err);
  }
}

// 3. Funzione fisica di invio comandi ESC/POS alla stampante
async function stampaOrdineSuStampanteTermica(ordine, device) {
  if (!device || !device.gatt.connected) {
    throw new Error("Stampante Bluetooth non connessa!");
  }

  // Costruzione comandi ESC/POS
  let textToPrint = "\x1B\x40"; // Inizializza
  textToPrint += "\x1B\x61\x01"; // Centrato
  textToPrint += "--- NAKAI TIKI BAR ---\n";
  textToPrint += `Tavolo: ${ordine.tavolo || "N/D"}\n`;
  textToPrint += "--------------------------------\n";
  textToPrint += "\x1B\x61\x00"; // Sinistra

  if (ordine.items && Array.isArray(ordine.items)) {
    ordine.items.forEach(item => {
      textToPrint += `${item.qty || 1}x ${item.name || item.nome}\n`;
    });
  }

  textToPrint += "\n\n\x1B\x69"; // Taglio carta

  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(textToPrint);

  const server = await device.gatt.connect();
  const SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb";
  const CHARACTERISTIC_UUID = "00002af1-0000-1000-8000-00805f9b34fb";

  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

  // Invio a blocchi
  const MAX_CHUNK_SIZE = 512;
  for (let i = 0; i < dataBytes.length; i += MAX_CHUNK_SIZE) {
    const chunk = dataBytes.slice(i, i + MAX_CHUNK_SIZE);
    await characteristic.writeValue(chunk);
  }

  console.log("Stampa completata con successo!");
}




