import { createClient } from "@supabase/supabase-js";

// 1. Inserisci qui le tue chiavi di Supabase (le stesse prese dalla dashboard)
const SUPABASE_URL = "https://tcejemysktofcmfhvgoj.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_cpLpaon8UubJw7jbYr8s5Q_p7JNP5J7";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Funzione che avvia l'ascolto in tempo reale degli ordini
function avviaAscoltoOrdini() {
  supabase
    .channel("ordini-ristorante")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "ordini" },
      async (payload) => {
        const nuovoOrdine = payload.new;
        console.log("Nuovo ordine ricevuto dal cloud:", nuovoOrdine);

        // Chiama la funzione di stampa fisica
        await stampaOrdineSuStampanteTermica(nuovoOrdine);

        // Aggiorna lo stato a "stampato" per evitare doppie stampe
        await supabase
          .from("ordini")
          .update({ stato: "stampato" })
          .eq("id", nuovoOrdine.id);
      }
    )
    .subscribe();

  console.log("Ponte Android in ascolto degli ordini in tempo reale...");
}

// 3. Funzione per la gestione della stampante termica sul tablet Android
async function stampaOrdineSuStampanteTermica(ordine) {
  console.log(`Stampando per reparto: ${ordine.destinazione}`);
  console.log("Piatti:", ordine.piatti);
  
  if (ordine.destinazione === "Conto") {
    console.log(`Totale conto: € ${ordine.totale}`);
  }
  
  // Inserisci qui il codice per inviare i comandi alla stampante termica (es. tramite Bluetooth o USB)
}

// Avvia il servizio
avviaAscoltoOrdini();
