import { createClient } from "@supabase/supabase-js";

// 1. Credenziali di Supabase
const SUPABASE_URL = "https://tcejemysktofcmfhvgoj.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_cpLpaon8UubJw7jbYr8s5Q_p7JNP5J7";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Funzione che avvia l'ascolto in tempo reale degli ordini
function avviaAscoltoOrdini() {
  supabase
    .channel("ordini-ristorante")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "print_jobs" },
      async (payload) => {
        const nuovoJob = payload.new;
        console.log("Nuovo ordine ricevuto dal cloud:", nuovoJob);

        // Estrae i dati reali dal payload JSON salvato nella tabella
        const datiOrdine = nuovoJob.payload || {};

        // Chiama la funzione di stampa fisica passando i dati dell'ordine
        await stampaOrdineSuStampanteTermica(datiOrdine);

        // Aggiorna lo stato a "stampato" nella tabella print_jobs
        await supabase
          .from("print_jobs")
          .update({ status: "stampato" })
          .eq("id", nuovoJob.id);
      }
    )
    .subscribe();

  console.log("Ponte Android in ascolto degli ordini in tempo reale su print_jobs...");
}

// 3. Funzione per la gestione della stampante termica sul tablet Android
async function stampaOrdineSuStampanteTermica(ordine) {
  console.log(`Stampando per tavolo: ${ordine.tavolo} - Destinazione: ${ordine.destination}`);
  console.log("Piatti:", ordine.items);
  
  if (ordine.destination === "Conto") {
    console.log(`Totale conto: € ${ordine.total}`);
  }
  
  // Inserisci qui il codice per inviare i comandi alla stampante termica (tramite Bluetooth o USB)
}

// Avvia il servizio
avviaAscoltoOrdini();
