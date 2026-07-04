import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, setDoc, query, where, getDocs, updateDoc, arrayUnion, increment, serverTimestamp, deleteDoc, onSnapshot, writeBatch, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB4JVhMz_vfHoMTiwmph6BOVNrFa-dNiVs",
    authDomain: "refar-shop.firebaseapp.com",
    projectId: "refar-shop",
    storageBucket: "refar-shop.firebasestorage.app",
    messagingSenderId: "1008350631085",
    appId: "1:1008350631085:web:c7abc01a2d78b31516e224",
    measurementId: "G-5DCR2HL26V"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.firebaseDB = {
    db, collection, doc, getDoc, setDoc, query, where, getDocs, updateDoc,
    arrayUnion, increment, serverTimestamp, deleteDoc, onSnapshot, writeBatch, runTransaction
};

console.log("Firebase initialized");