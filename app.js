import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator, ScrollView } from 'react-native';
import { BleManager } from 'react-native-ble-plx';

const bleManager = new BleManager();

export default function App() {
  const [printerStatus, setPrinterStatus] = useState('ATTESA CONNESSIONE');
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [localIp, setLocalIp] = useState('192.168.1.150');
  const [logs, setLogs] = useState(['[SYSTEM] Bridge avviato in attesa...']);

  const addLog = (msg) => {
    setLogs(prev => [ `[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 5) ]);
  };

  // Funzione unificata per la connessione Bluetooth
  const scanAndConnectPrinter = async () => {
    setIsScanning(true);
    setPrinterStatus('VERIFICA DISPOSITIVI...');
    addLog('Controllo periferiche Bluetooth memorizzate...');

    try {
      // 1. Prima controlla se ci sono dispositivi già connessi o noti al sistema
      const connectedDevices = await bleManager.connectedDevicesInsecure ? [] : await bleManager.connectedDevices([]);
      
      let targetDevice = connectedDevices.find(d => 
        d.name && (d.name.toUpperCase().includes('PRINT') || d.name.toUpperCase().includes('POS') || d.name.toUpperCase().includes('MTP'))
      );

      if (targetDevice) {
        addLog(`Trovato dispositivo già connesso: ${targetDevice.name}`);
        setConnectedDevice(targetDevice);
        setPrinterStatus('CONNESSO & PRONTO');
        setIsScanning(false);
        return;
      }

      // 2. Se non è già connesso, avvia la scansione rapida
      setPrinterStatus('SCANSIONE BLUETOOTH...');
      addLog('Avvio scansione circostante...');

      bleManager.startDeviceScan(null, null, async (error, device) => {
        if (error) {
          setIsScanning(false);
          setPrinterStatus('ERRORE BT');
          addLog(`Errore Bluetooth: ${error.message}`);
          bleManager.stopDeviceScan();
          return;
        }

        if (device && device.name) {
          addLog(`Rilevato: ${device.name}`);
          
          if (device.name.toUpperCase().includes('PRINT') || device.name.toUpperCase().includes('POS') || device.name.toUpperCase().includes('MTP')) {
            bleManager.stopDeviceScan();
            addLog(`Connessione a ${device.name}...`);
            
            try {
              const connectedDev = await device.connect();
              const fullyConnected = await connectedDev.discoverAllServicesAndCharacteristics();
              
              setIsScanning(false);
              setConnectedDevice(fullyConnected);
              setPrinterStatus('CONNESSO & PRONTO');
              addLog(`Connesso con successo a ${fullyConnected.name}`);
            } catch (err) {
              setIsScanning(false);
              setPrinterStatus('FALLITO');
              addLog(`Errore connessione GATT: ${err.message}`);
            }
          }
        }
      });

      // Timeout di sicurezza a 8 secondi
      setTimeout(() => {
        bleManager.stopDeviceScan();
        if (isScanning) {
          setIsScanning(false);
          if (!connectedDevice) setPrinterStatus('NON TROVATA');
          addLog('Scansione terminata senza riscontri.');
        }
      }, 8000);

    } catch (err) {
      setIsScanning(false);
      setPrinterStatus('ERRORE');
      addLog(`Eccezione: ${err.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>LOLLO-STAMP</Text>
        <Text style={styles.headerSubtitle}>ANDROID FIBER BRIDGE</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.card}>
          <Text style={styles.cardLabel}>STATO STAMPANTE BLUETOOTH</Text>
          <View style={[
            styles.ledBox, 
            printerStatus.includes('CONNESSO') ? styles.ledBoxActive : styles.ledBoxWait
          ]}>
            {isScanning ? (
              <ActivityIndicator color="#39FF14" />
            ) : (
              <Text style={[
                styles.ledText, 
                printerStatus.includes('CONNESSO') ? styles.ledTextActive : styles.ledTextWait
              ]}>
                {printerStatus}
              </Text>
            )}
          </View>
          <Text style={styles.deviceInfo}>
            {connectedDevice ? `Dispositivo: ${connectedDevice.name}` : "Nessuna stampante attiva"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>ENDPOINT LOCALE Wi-Fi</Text>
          <View style={styles.ipContainer}>
            <Text style={styles.ipProtocol}>http://</Text>
            <Text style={styles.ipAddress}>{localIp}</Text>
            <Text style={styles.ipPort}>:8080/print</Text>
          </View>
          <Text style={styles.cardSubtext}>Usa questo indirizzo sul gestionale</Text>
        </View>

        <View style={styles.logCard}>
          <Text style={styles.cardLabel}>LOG DI COMUNICAZIONE</Text>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>{log}</Text>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={scanAndConnectPrinter}
          disabled={isScanning}
        >
          <Text style={styles.actionButtonText}>
            {connectedDevice ? "RICONNETTI STAMPANTE" : "CERCA STAMPANTE BLUETOOTH"}
          </Text>
        </TouchableOpacity>

      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.statusDot} />
        <Text style={styles.footerText}>ONLINE • PRONTO</Text>
      </View>

    </SafeAreaView>
  );
}

const BG_COLOR = '#0a0e17';
const CARD_BG = '#111827';
const LED_GREEN = '#39FF14';
const LED_YELLOW = '#FACC15';
const BORDER_COLOR = '#1F2937';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG_COLOR },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: LED_GREEN, letterSpacing: 2 },
  headerSubtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 4, letterSpacing: 1 },
  content: { padding: 20, gap: 15 },
  card: { backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 12, padding: 18 },
  logCard: { backgroundColor: CARD_BG, borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 12, padding: 15, minHeight: 100 },
  cardLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 10, letterSpacing: 1, fontWeight: '600' },
  ledBox: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#030712' },
  ledBoxActive: { borderColor: LED_GREEN },
  ledBoxWait: { borderColor: LED_YELLOW },
  ledText: { fontSize: 15, fontWeight: 'bold', letterSpacing: 1.5 },
  ledTextActive: { color: LED_GREEN },
  ledTextWait: { color: LED_YELLOW },
  deviceInfo: { fontSize: 12, color: '#D1D5DB', marginTop: 8, textAlign: 'center' },
  ipContainer: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', backgroundColor: '#030712', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: BORDER_COLOR },
  ipProtocol: { color: '#6B7280', fontSize: 13 },
  ipAddress: { color: '#00F0FF', fontSize: 24, fontWeight: 'bold', marginHorizontal: 4 },
  ipPort: { color: '#6B7280', fontSize: 14 },
  cardSubtext: { fontSize: 10, color: '#6B7280', textAlign: 'center', marginTop: 6 },
  logText: { fontFamily: 'monospace', fontSize: 11, color: '#39FF14', marginVertical: 2 },
  actionButton: { backgroundColor: '#1E3A8A', borderWidth: 1, borderColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  footer: { padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: BORDER_COLOR, backgroundColor: CARD_BG },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: LED_GREEN, marginRight: 8 },
  footerText: { fontSize: 10, color: '#9CA3AF', letterSpacing: 1, fontWeight: '600' }
});

