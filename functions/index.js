const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function to sync Firebase Authentication users to Firestore
 * This allows the admin dashboard to display all users
 *
 * Callable by admin users only
 */
exports.syncAuthUsersToFirestore = functions.https.onCall(async (data, context) => {
    // Check if user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'User must be authenticated to sync users.'
        );
    }

    // Check if user is admin
    const userDoc = await admin.firestore()
        .collection('users')
        .doc(context.auth.uid)
        .get();

    if (!userDoc.exists || userDoc.data().role !== 'admin') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only administrators can sync users.'
        );
    }

    try {
        let syncedCount = 0;
        let updatedCount = 0;
        const errors = [];

        // List all users from Firebase Authentication (paginated)
        const listAllUsers = async (nextPageToken) => {
            const result = await admin.auth().listUsers(1000, nextPageToken);

            for (const userRecord of result.users) {
                try {
                    const userRef = admin.firestore().collection('users').doc(userRecord.uid);
                    const userDoc = await userRef.get();

                    // Determine role based on email
                    const role = userRecord.email === 'info@suapaai.com' ? 'admin' : 'user';

                    if (!userDoc.exists) {
                        // Create new user document
                        await userRef.set({
                            uid: userRecord.uid,
                            displayName: userRecord.displayName || '',
                            email: userRecord.email || '',
                            photoURL: userRecord.photoURL || '',
                            role: role,
                            createdAt: new Date(userRecord.metadata.creationTime),
                            lastLogin: new Date(userRecord.metadata.lastSignInTime || userRecord.metadata.creationTime),
                            syncedFromAuth: true,
                            syncedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        syncedCount++;
                    } else {
                        // Update existing user with latest auth data
                        await userRef.update({
                            displayName: userRecord.displayName || userDoc.data().displayName || '',
                            email: userRecord.email || userDoc.data().email || '',
                            photoURL: userRecord.photoURL || userDoc.data().photoURL || '',
                            role: role, // Ensure admin role is set for admin email
                            lastLogin: new Date(userRecord.metadata.lastSignInTime || userRecord.metadata.creationTime),
                            syncedFromAuth: true,
                            syncedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        updatedCount++;
                    }
                } catch (error) {
                    console.error(`Error syncing user ${userRecord.uid}:`, error);
                    errors.push({
                        uid: userRecord.uid,
                        email: userRecord.email,
                        error: error.message
                    });
                }
            }

            // If there are more users, continue pagination
            if (result.pageToken) {
                await listAllUsers(result.pageToken);
            }
        };

        // Start the sync process
        await listAllUsers();

        return {
            success: true,
            message: 'User sync completed successfully',
            syncedCount: syncedCount,
            updatedCount: updatedCount,
            totalProcessed: syncedCount + updatedCount,
            errors: errors.length > 0 ? errors : null
        };

    } catch (error) {
        console.error('Error in syncAuthUsersToFirestore:', error);
        throw new functions.https.HttpsError(
            'internal',
            'Failed to sync users: ' + error.message
        );
    }
});

/**
 * Triggered when a new user is created in Firebase Authentication
 * Automatically creates their Firestore document
 */
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
    try {
        // Determine role based on email
        const role = user.email === 'info@suapaai.com' ? 'admin' : 'user';

        await admin.firestore().collection('users').doc(user.uid).set({
            uid: user.uid,
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            role: role,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        console.log(`User ${user.uid} created in Firestore`);
    } catch (error) {
        console.error('Error creating user in Firestore:', error);
    }
});

/**
 * Triggered when a user is deleted from Firebase Authentication
 * Optionally delete or mark their Firestore document
 */
exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
    try {
        // Option 1: Delete the user document
        // await admin.firestore().collection('users').doc(user.uid).delete();

        // Option 2: Mark as deleted (recommended for data retention)
        await admin.firestore().collection('users').doc(user.uid).update({
            deleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`User ${user.uid} marked as deleted in Firestore`);
    } catch (error) {
        console.error('Error deleting user in Firestore:', error);
    }
});
