import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const BleManagerModule = NativeModules.BleManager;
const BleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const App = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [peripherals, setPeripherals] = useState(new Map());

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
  }, []);

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
    }
  };

  useEffect(() => {
    const discoverPeripheralListener = BleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscoverPeripheral
    );

    return () => {
      discoverPeripheralListener.remove();
    };
  }, [peripherals]);

  const connectToPeripheral = (peripheralId) => {
    console.log('pressed connect button');
    BleManager.connect(peripheralId)
      .then(() => {
        console.log('Connected to ' + peripheralId);
      })
      .catch((error) => {
        console.log('Connection error', error);
      });
  };

  const renderItem = ({ item }) => (
    <View style={styles.peripheralItem}>
      <View style={styles.peripheralInfo}>
        <Text style={styles.peripheralName}>{item.name || 'Unnamed Device'}</Text>
        <Text style={styles.peripheralId}>{item.id}</Text>
      </View>
      <Button
        title="Connect"
        onPress={() => connectToPeripheral(item.id)}
        disabled={isScanning}
        color="#1E90FF" // Bright button color
      />
    </View>
  );
  return (
    <View style={styles.container}>
      <Button title="Start Scanning" onPress={startScan} color="#1E90FF"/>
      <FlatList
        data={Array.from(peripherals.values())}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
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
});

export default App;
