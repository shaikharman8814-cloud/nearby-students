import { db } from './firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    arrayUnion,
    arrayRemove,
    query,
    where,
    orderBy,
    addDoc
} from 'firebase/firestore';
import { UserProfile } from './db';

export interface Group {
    id: string;
    name: string;
    description: string;
    createdBy: string;
    members: string[]; // array of user UIDs
    createdAt: string;
    photoURL?: string;
    category?: string;
}

// Create a new group
export const createGroup = async (userId: string, data: Partial<Group>) => {
    const groupsRef = collection(db, 'groups');
    const newGroupRef = doc(groupsRef); // Auto-ID

    const groupData: Group = {
        id: newGroupRef.id,
        name: data.name || 'Untitled Group',
        description: data.description || '',
        createdBy: userId,
        members: [userId], // Creator is first member
        createdAt: new Date().toISOString(),
        photoURL: data.photoURL || '',
        category: data.category || 'General'
    };

    await setDoc(newGroupRef, groupData);
    return groupData;
};

// Get all groups (for discovery)
export const getAllGroups = async () => {
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Group);
};

// Get groups a user belongs to
export const getUserGroups = async (userId: string) => {
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, where('members', 'array-contains', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Group);
};

// Join a group
export const joinGroup = async (groupId: string, userId: string) => {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
        members: arrayUnion(userId)
    });
};

// Leave a group
export const leaveGroup = async (groupId: string, userId: string) => {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
        members: arrayRemove(userId)
    });
};

// Get single group details
export const getGroup = async (groupId: string) => {
    const groupRef = doc(db, 'groups', groupId);
    const snapshot = await getDoc(groupRef);
    if (snapshot.exists()) {
        return snapshot.data() as Group;
    }
    return null;
};

// Add member to group
export const addMemberToGroup = async (groupId: string, userId: string) => {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
        members: arrayUnion(userId)
    });
};

// Remove member from group
export const removeMemberFromGroup = async (groupId: string, userId: string) => {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
        members: arrayRemove(userId)
    });
};
