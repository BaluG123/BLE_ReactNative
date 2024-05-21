import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, PermissionsAndroid, Platform,TouchableOpacity,SafeAreaView } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Buffer } from 'buffer';

const BleManagerModule = NativeModules.BleManager;
const BleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const App = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [peripherals, setPeripherals] = useState(new Map());
  const [connectedPeripheralId, setConnectedPeripheralId] = useState(null);
  const [bleData, setBleData] = useState({ speed: 0, odo: 0, temperature: 0,batterystatus:0 });
  const [dataStreamCount, setDataStreamCount] = useState(0);

  useEffect(() => {
    BleManager.start({ showAlert: false });

    const requestBluetoothPermission = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        if (
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
        ) {
          console.log('Bluetooth permissions granted');
        } else {
          console.log('Bluetooth permissions denied');
        }
      }
    };

    requestBluetoothPermission();

    
    const discoverPeripheralListener = BleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral
    );
    const updateValueListener = BleManagerEmitter.addListener(
      'BleManagerDidUpdateValueForCharacteristic',
      handleUpdateValueForCharacteristic
    );

    return () => {
      discoverPeripheralListener.remove();
      updateValueListener.remove();
    };
  }, [peripherals]);

  const startScan = () => {
    if (!isScanning) {
      BleManager.scan([], 10, true)
        .then(() => {
          console.log('Scanning...');
          setIsScanning(true);
        })
        .catch((error) => {
          console.log('Scan error', error);
        });
    }
  };

  const handleDiscoverPeripheral = (peripheral) => {
    if (peripheral.name) {
      setPeripherals(new Map(peripherals.set(peripheral.id, peripheral)));
      console.log(peripheral,'device data')
    }
  };


  const connectToPeripheral = (peripheralId) => {
    console.log('id',peripheralId)
    BleManager.connect(peripheralId)
      .then(() => {
        console.log('Connected to ' + peripheralId);
        setConnectedPeripheralId(peripheralId);
      })
      .catch((error) => {
        console.log('Connection error', error);
      });
  };

  const disconnectFromPeripheral = (peripheralId) => {
    BleManager.disconnect(peripheralId)
      .then(() => {
        console.log('Disconnected from ' + peripheralId);
        setConnectedPeripheralId(null);
      })
      .catch((error) => {
        console.log('Disconnection error', error);
      });
  };

  const startNotification = (peripheralId) => {
    const serviceUUID = '0000180f-0000-1000-8000-00805f9b34fb';  // Replace with your service UUID
    const characteristicUUID = '3fe17662-9786-11eb-a8b3-0242ac130003';  // Replace with your characteristic UUID

    BleManager.startNotification(peripheralId, serviceUUID, characteristicUUID)
      .then(() => {
        console.log('Notification started');
      })
      .catch((error) => {
        console.log('Notification error', error);
      });
  };

  const handleUpdateValueForCharacteristic = ({ value }) => {
    const buffer = Buffer.from(value);
    const data = buffer.toString();
    handleBLEData(data);
  };

  const handleBLEData = (data) => {
    const decodedData = data.split('|');
    setBleData({
      speed: parseInt(decodedData[0], 10),
      odo: parseFloat(decodedData[1]),
      temperature: parseInt(decodedData[2], 10),
      batterystatus: parseInt(decodedData[3])
    });
    setDataStreamCount(prevCount => prevCount + 1);
  };

  const renderItem = ({ item }) => (
    <View style={styles.peripheralItem}>
    <View>
      <Text style={styles.peripheralName}>{item.name || 'Unnamed Device'}</Text>
      <Text style={styles.peripheralId}>{item.id}</Text>
    </View>
    {connectedPeripheralId === item.id ? (
      <Button title="Disconnect" onPress={() => disconnectFromPeripheral(item.id)} />
    ) : (
      <Button title="Connect" onPress={() => connectToPeripheral(item.id)} />
    )}
  </View>
  );
  return (
    <SafeAreaView style={styles.container}>
    <TouchableOpacity style={styles.scanButton} onPress={startScan}>
      <Text style={styles.scanButtonText}>Start Scanning</Text>
    </TouchableOpacity>
    <FlatList
      data={Array.from(peripherals.values())}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
    />
    {connectedPeripheralId && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataText}>Speed: {bleData.speed}</Text>
          <Text style={styles.dataText}>ODO: {bleData.odo}</Text>
          <Text style={styles.dataText}>Temperature: {bleData.temperature}</Text>
          <Text style={styles.dataText}>Data Stream Count: {dataStreamCount}</Text>
          <Text style={styles.dataText}>batteryStatus: {bleData.batterystatus} </Text>
        </View>
      )}
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: wp('4%'),
    backgroundColor: '#F0F8FF', // Light background color
  },
  peripheralItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1%'),
    paddingVertical: hp('1%'),
    paddingHorizontal: wp('2%'),
    borderWidth: 1,
    borderColor: '#1E90FF', // Bright border color
    borderRadius: wp('2%'),
    backgroundColor: '#FFFFFF', // White background for each item
    marginTop:hp('1%')
  },
  peripheralInfo: {
    flexDirection: 'column',
  },
  peripheralName: {
    fontSize: wp('4%'),
    color: 'black', // Bright font color
    marginBottom: hp('0.5%'), // Space between name and id
    fontWeight:'400'
  },
  peripheralId: {
    fontSize: wp('3.5%'),
    color: 'green', // Bright font color
  },
  scanButton: {
    backgroundColor: '#007bff',
    padding: wp('4%'),
    borderRadius: wp('2%'),
    alignItems: 'center',
    marginBottom: hp('2%'),
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: wp('4%'),
  },
  dataContainer: {
    marginTop: hp('2%'),
    padding: wp('4%'),
    backgroundColor: '#ffffff',
    borderRadius: wp('2%'),
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  dataText: {
    fontSize: wp('4%'),
    color: '#333333',
    marginBottom: hp('1%'),
  },
});

export default App;
