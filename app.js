// Inizializza il client Supabase
const SUPABASE_URL = 'https://yyrawuynqukwszvotiuu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5pTXjGcknQWzbVDWwD4tSQ_trCjQV0b';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variabile con nome univoco per evitare conflitti con index.html
let myPrinterDevice = null;

// 1. Connessione alla stampante Bluetooth
async function connettiStampante() {
  try {
    console.log("Apertura ricerca dispositivi Bluetooth...");
    myPrinterDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"]
    });
    console.log(`Dispositivo selezionato: ${myPrinterDevice.name}`);
    
    // Gestione disconnessione
    myPrinterDevice.addEventListener('gattserverdisconnected', onDisconnected);

    // Connessione GATT
    await myPrinterDevice.gatt.connect();
    console.log("Stampante Bluetooth connessa con successo!");
    
    const statusElem = document.getElementById("status-connessione");
    if (statusElem) {
      statusElem.innerText = "Stampante Connessa: " + myPrinterDevice.name;
    }

  } catch (error) {
    console.error("Errore/Annullato:", error);
    alert("Errore di connessione Bluetooth: " + error.message);
  }
}

function onDisconnected(event) {
  console.log(`Dispositivo disconnesso: ${event.target.name}`);
  myPrinterDevice = null;
  const statusElem = document.getElementById("status-connessione");
  if (statusElem) {
    statusElem.innerText = "In attesa di associazione Bluetooth...";
  }
}

// 2. Recupero e stampa da Supabase
async function stampaUltimoOrdineDaSupabase() {
  try {
    console.log("Recupero ordine da Supabase...");
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

    await stampaOrdineSuStampanteTermica(ultimoOrdine, myPrinterDevice);

  } catch (err) {
    console.error("Errore nel recupero o stampa da Supabase:", err);
  }
}

// 3. Invio comandi ESC/POS
async function stampaOrdineSuStampanteTermica(ordine, device) {
  if (!device || !device.gatt.connected) {
    throw new Error("Stampante Bluetooth non connessa!");
  }

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

  const MAX_CHUNK_SIZE = 512;
  for (let i = 0; i < dataBytes.length; i += MAX_CHUNK_SIZE) {
    const chunk = dataBytes.slice(i, i + MAX_CHUNK_SIZE);
    await characteristic.writeValue(chunk);
  }

  console.log("Stampa completata con successo!");
}
