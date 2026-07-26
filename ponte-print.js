import { createClient } from "@supabase/supabase-js";

// 1. Credenziali di Supabase
const SUPABASE_URL = "https://yyrawuynqukwszvotiuu.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cmF3dXlucXVrd3N6dm90aXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwOTQ0NDAsImV4cCI6MjEwMDY3MDQ0MH0.TL_s3_j8sMX_E3IpqmXj-yiPlWTdEHw4zzPB-3RUCo8";
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
