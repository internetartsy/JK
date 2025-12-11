import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';
import { setRole } from '../../store/authSlice';
import { Colors } from '../../styles/colors';

export default function RoleSelectionScreen({ navigation }: any) {
    const dispatch = useDispatch();

    const selectRole = (role: string) => {
        dispatch(setRole(role));
        // Navigate to appropriate Dashboard based on role
        // For now, simple navigation switch
        if (role === 'OPERATOR') navigation.replace('OperatorTabs');
        else if (role === 'VERIFIER') navigation.replace('VerifierTabs');
        else if (role === 'TAHSILDAR') navigation.replace('TahsildarTabs');
        else if (role === 'FIELD_TEAM') navigation.replace('FieldTeamTabs');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Select Your Role</Text>

            <View style={styles.buttonContainer}>
                <Button title="Operator (Patwari)" onPress={() => selectRole('OPERATOR')} color={Colors.primary} />
            </View>

            <View style={styles.buttonContainer}>
                <Button title="Verifier (Girdawar)" onPress={() => selectRole('VERIFIER')} color={Colors.secondary} />
            </View>

            <View style={styles.buttonContainer}>
                <Button title="Tahsildar" onPress={() => selectRole('TAHSILDAR')} color={Colors.warning} />
            </View>

            <View style={styles.buttonContainer}>
                <Button title="Field Team" onPress={() => selectRole('FIELD_TEAM')} color="#000" />
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        backgroundColor: Colors.background,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 40,
        textAlign: 'center',
        color: Colors.text
    },
    buttonContainer: {
        marginBottom: 20,
    }
});
