import { useState } from 'react';
import { StyleSheet, Text, View, Button, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { OCRService } from './services/OCRService';
import { SyncService } from './services/SyncService';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, // Let OCR handle full crop/rotation
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setOcrResult(null);
    }
  };

  const uploadAndProcess = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const result = await OCRService.uploadForProcessing(image, 'girdawari');
      console.log("OCR Job Started:", result);
      // For demo, we might poll immediately or just show "Queued"
      Alert.alert("Success", `OCR Job Started! Job ID: ${result.job_id}`);
      setOcrResult(result);

      // Attempt a sync to see if any updates come back (unlikely so fast, but verifies connection)
      // await SyncService.sync(); 
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to upload");
    } finally {
      setLoading(false);
    }
  };

  const runSync = async () => {
    setLoading(true);
    try {
      await SyncService.sync();
      Alert.alert("Sync Complete", "Data synchronized with server.");
    } catch (error: any) {
      Alert.alert("Sync Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AgriStack Native</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>1. OCR Capture</Text>
        <Button title="Pick Document Image" onPress={pickImage} />
        {image && <Image source={{ uri: image }} style={styles.image} />}

        {image && !loading && (
          <View style={{ marginTop: 10 }}>
            <Button title="Upload & Process (Async)" onPress={uploadAndProcess} color="#16a34a" />
          </View>
        )}
      </View>

      {ocrResult && (
        <View style={styles.resultCard}>
          <Text style={styles.successText}>Job Queued: {ocrResult.job_id}</Text>
          <Text style={{ fontSize: 12, color: '#666' }}>Status: {ocrResult.status}</Text>
        </View>
      )}

      {loading && <ActivityIndicator size="large" color="#16a34a" style={{ marginVertical: 20 }} />}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. Data Sync</Text>
        <Text style={styles.desc}>Push offline records & pull latest registry data.</Text>
        <Button title="Run Delta Sync" onPress={runSync} color="#2563eb" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#0f172a'
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 20,
  },
  resultCard: {
    backgroundColor: '#dcfce7',
    padding: 15,
    borderRadius: 8,
    width: '90%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#16a34a'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#334155'
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 10,
    resizeMode: 'contain'
  },
  desc: {
    marginBottom: 10,
    color: '#64748b'
  },
  successText: {
    color: '#15803d',
    fontWeight: 'bold'
  }
});
