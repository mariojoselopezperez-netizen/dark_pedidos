import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signOut, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, getDoc, runTransaction } from 'firebase/firestore';
import Reportes from './pages/Reportes';
import Contabilidad from './pages/Contabilidad';
import { FaCog } from "react-icons/fa";
import Configuraciones from "./pages/Config";
// El CSS ahora está incrustado al final del componente para evitar problemas de ruta.

// --- Funciones Auxiliares de Firebase y Configuración ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Configuración de Firebase: Estos son los datos REALES de tu proyecto de Firebase que proporcionaste.
const defaultFirebaseConfig = {
  apiKey: "AIzaSyAt5grQ4yMiIG8THJnlKImAt2j5amPcZ_s",
  authDomain: "my-pos-app-avanzada.firebaseapp.com",
  projectId: "my-pos-app-avanzada",
  storageBucket: "my-pos-app-avanzada.firebasestorage.app",
  messagingSenderId: "19454132579",
  appId: "1:19454132579:web:efa061b1f63ad30f269356",
  measurementId: "G-K6Q5031BB4"
};

const firebaseConfig = typeof __firebase_config !== 'undefined' && Object.keys(JSON.parse(__firebase_config)).length > 0
    ? JSON.parse(__firebase_config)
    : defaultFirebaseConfig;

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let firebaseAppInstance;
let dbInstance;
let authInstance;

// Inicialización de Firebase (se ejecuta una vez y establece las instancias globales)
const initFirebase = () => {
    if (!firebaseAppInstance) {
        try {
            firebaseAppInstance = initializeApp(firebaseConfig);
            dbInstance = getFirestore(firebaseAppInstance);
            authInstance = getAuth(firebaseAppInstance);
            console.log("Firebase inicializado con éxito.");
        } catch (error) {
            console.error("Error al inicializar Firebase. Asegúrate de que firebaseConfig sea válido:", error);
            // Podrías mostrar un error en la UI aquí si la inicialización falla
        }
    }
};

// --- Componente Principal de la Aplicación ---
const App = () => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState('invitado'); // 'invitado', 'empleado', 'admin'
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [contabilidadTab, setContabilidadTab] = useState('registros');
    const [displayName, setDisplayName] = useState('Cargando...'); // Nuevo estado para el nombre legible

    // Estados para Gestión de Productos
    const [products, setProducts] = useState([]);
    const [newProductName, setNewProductName] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');
    const [newProductStock, setNewProductStock] = useState('');
    const [newProductImage, setNewProductImage] = useState(''); // Nuevo estado para la imagen del producto
    const [newProductNoStock, setNewProductNoStock] = useState(false); // Nuevo estado para facturar sin stock
    const [editingProduct, setEditingProduct] = useState(null);

    // Estados para Gestión de Pedidos y Mesas
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [currentOrder, setCurrentOrder] = useState([]); // [{ product, quantity, orderId (para asociar pedido a mesa) }]
    const [productSearchTerm, setProductSearchTerm] = useState('');

    // Estados para renombrar mesas
    const [renamingTableId, setRenamingTableId] = useState(null);
    const [newTableNameInput, setNewTableNameInput] = useState('');

    // Nuevos estados para el flujo de autenticación
    const [authMode, setAuthMode] = useState('choice'); // 'choice', 'anonymous', 'admin_login'
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    // Estado para el modal de edición de perfil
    const [showProfileEditModal, setShowProfileEditModal] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState('');

    // New states for payment and ticket
    const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState(false);
    const [currentTableForPayment, setCurrentTableForPayment] = useState(null);
    const [isGeneratingTicket, setIsGeneratingTicket] = useState(false);

    // Company and Invoice settings (fetched from Firestore)
    const [companySettings, setCompanySettings] = useState({
        logoUrl: 'https://placehold.co/150x50/2c3e50/ffffff?text=Tu+Logo', // Default placeholder
        name: 'Tu Empresa POS',
        ruc: '0000000000000', // Placeholder RUC numeric-like
        nextInvoiceNumber: 1
    });

    // New state for central table renaming management
    const [showRenameTableManagementModal, setShowRenameTableManagementModal] = useState(false);


    // --- Efecto de Inicialización de Firebase y Autenticación ---
    useEffect(() => {
        initFirebase(); // Asegura que Firebase esté inicializado

        // Solo intentar autenticar si authInstance ha sido inicializada con éxito
        if (authInstance) {
            const unsubscribeAuth = onAuthStateChanged(authInstance, async (currentUser) => {
                if (currentUser) {
                    setUser(currentUser);
                    // Lógica de roles: Ejemplo simple.
                    // Se utiliza el UID proporcionado para reconocer al administrador.
                    if (currentUser.uid === 'gPJv3OnJIQfS8B5rmlbT6o35u4G2') {
                        setRole('admin');
                    } else if (currentUser.isAnonymous) {
                        setRole('invitado');
                    } else {
                        setRole('empleado'); // Cualquier otro usuario autenticado (no anónimo ni admin específico)
                    }

                    // Solo cargar displayName si la instancia de la base de datos existe
                    if (dbInstance) {
                    const userDocRef = doc(dbInstance, `artifacts/${appId}/users/${currentUser.uid}/profile/info`);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists() && userDocSnap.data().displayName) {
                        setDisplayName(userDocSnap.data().displayName);
                    } else {
                        setDisplayName(currentUser.isAnonymous ? 'Invitado' : currentUser.email || `Usuario ${currentUser.uid.substring(0, 4)}`);
                    }
                    } else {
                        console.error("Error: dbInstance es null. No se pudo cargar el nombre de usuario.");
                        }

                    setAuthMode('authenticated'); // Una vez autenticado, ya no se muestra la pantalla de elección
                } else {
                    setUser(null);
                    setRole('invitado');
                    setDisplayName('Invitado');
                    // Si el usuario no está autenticado, volvemos al modo de elección
                    setAuthMode('choice');
                }
                setLoading(false);
            });
            return () => unsubscribeAuth();
        } else {
            setLoading(false); // Si Firebase Auth no se inicializó, terminar la carga.
            console.error("Firebase Auth no está inicializado. No se pudo configurar onAuthStateChanged.");
        }
    }, [dbInstance, appId]); // Agregado dbInstance y appId a las dependencias para que se recargue el nombre si estos cambian.

    // --- Efecto para Cargar Productos de Firestore (en tiempo real) ---
    useEffect(() => {
        // Solo intentar cargar productos si dbInstance y user están listos
        if (dbInstance && user) {
            const productsCollectionRef = collection(dbInstance, `artifacts/${appId}/users/${user.uid}/products`);
            const q = query(productsCollectionRef);

            const unsubscribeProducts = onSnapshot(q, (snapshot) => {
                // ✨ Verificación clave: Asegurarse de que el 'snapshot' sea un objeto válido.
    if (snapshot) {
                const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setProducts(productsData);
                } else {
            // En caso de que el snapshot sea nulo, simplemente limpiamos la lista       
            console.warn("Snapshot de productos es nulo. No se pudo cargar la lista."); 
            setProducts([]);
             }
           }, (error) => {
                console.error("Error al obtener productos:", error);
            });

            return () => unsubscribeProducts();
        }
    }, [dbInstance, user, appId]); // Dependencias para re-ejecutar si dbInstance, user o appId cambian

    // --- Efecto para Cargar Mesas de Firestore (en tiempo real) ---
    useEffect(() => {
        if (dbInstance && user) {
            const tablesCollectionRef = collection(dbInstance, `artifacts/${appId}/users/${user.uid}/tables`);
            const q = query(tablesCollectionRef);

const unsubscribeTables = onSnapshot(q, (snapshot) => {
    // ✨ Verificación clave: Asegurarse de que el 'snapshot' sea un objeto válido.
    if (snapshot) {
        const tablesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTables(tablesData.sort((a, b) => {
            const numA = parseInt(a.name.replace('Mesa ', ''), 10);
            const numB = parseInt(b.name.replace('Mesa ', ''), 10);
            return numA - numB;
        }));
    } else {
        // En caso de que el snapshot sea nulo, simplemente limpiamos la lista
        console.warn("Snapshot de mesas es nulo. No se pudo cargar la lista.");
        setTables([]);
    }
}, (error) => {
    console.error("Error al obtener mesas:", error);
});

            return () => unsubscribeTables();
        }
    }, [dbInstance, user, appId]);

    // Effect to load company settings and next invoice number
    useEffect(() => {
        if (dbInstance && user) {
            const companySettingsRef = doc(dbInstance, `artifacts/${appId}/public/settings/companyInfo/config`);
            const unsubscribeSettings = onSnapshot(companySettingsRef, (docSnap) => {
                if (docSnap.exists()) {
                    setCompanySettings(prev => ({ ...prev, ...docSnap.data() }));
                } else {
                    // Initialize if not exists. Do not overwrite if it exists.
                    setDoc(companySettingsRef, companySettings, { merge: true }).catch(e => console.error("Error initializing company settings:", e));
                }
            }, (error) => {
                console.error("Error al obtener configuraciones de la empresa:", error);
            });

            return () => unsubscribeSettings();
        }
    }, [dbInstance, user, appId]);


    // --- Manejadores de Autenticación ---
    const handleLogout = async () => {
        if (authInstance) {
            try {
                await signOut(authInstance);
                setUser(null);
                setRole('invitado');
                setDisplayName('Invitado');
                setCurrentPage('dashboard');
                setAuthMode('choice'); // Volver a la pantalla de elección al cerrar sesión
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
            }
        }
    };

    const handleAnonymousLogin = async () => {
        if (authInstance) {
            try {
                const userCredential = await signInAnonymously(authInstance);
                // onAuthStateChanged se encargará de establecer el usuario y el rol
                // Establecer un display name por defecto para el invitado si no tiene uno
                const userDocRef = doc(dbInstance, `artifacts/${appId}/users/${userCredential.user.uid}/profile/info`);
                await setDoc(userDocRef, { displayName: 'Invitado', createdAt: serverTimestamp() }, { merge: true });

            } catch (error) {
                console.error("Error al iniciar sesión anónimamente:", error);
                alert("Error al iniciar sesión como invitado. Intente de nuevo.");
            }
        }
    };

    const handleAdminLogin = async () => {
        if (!adminEmail.trim() || !adminPassword.trim() || !authInstance) {
            alert("Por favor, introduce el email y la contraseña del administrador.");
            return;
        }
        try {
            const userCredential = await signInWithEmailAndPassword(authInstance, adminEmail, adminPassword);
            // onAuthStateChanged se encargará de establecer el usuario y el rol
            // Establecer un display name por defecto para el admin si no tiene uno
            const userDocRef = doc(dbInstance, `artifacts/${appId}/users/${userCredential.user.uid}/profile/info`);
            const userDocSnap = await getDoc(userDocRef);
            if (!userDocSnap.exists() || !userDocSnap.data().displayName) {
                await setDoc(userDocRef, { displayName: 'Administrador', createdAt: serverTimestamp() }, { merge: true });
            }

            setAdminEmail('');
            setAdminPassword('');
        } catch (error) {
            console.error("Error al iniciar sesión como administrador:", error);
            alert("Error al iniciar sesión como administrador. Verifique sus credenciales.");
        }
    };

    // --- Funciones de Gestión de Perfil ---
    const handleUpdateDisplayName = async () => {
        if (!newDisplayName.trim() || !user || !dbInstance) {
            alert("El nombre a mostrar no puede estar vacío.");
            return;
        }
        try {
            const userDocRef = doc(dbInstance, `artifacts/${appId}/users/${user.uid}/profile/info`);
            await setDoc(userDocRef, { displayName: newDisplayName.trim(), lastUpdate: serverTimestamp() }, { merge: true });
            setDisplayName(newDisplayName.trim());
            setShowProfileEditModal(false);
            setNewDisplayName('');
            alert("Nombre de usuario actualizado con éxito!");
        } catch (error) {
            console.error("Error al actualizar el nombre a mostrar:", error);
            alert("Error al actualizar el nombre de usuario. Inténtalo de nuevo.");
        }
    };


    // --- Funciones de Gestión de Productos (CRUD) ---
    const addProduct = async () => {
        if (!newProductName || !newProductPrice || (!newProductNoStock && !newProductStock) || !user || !dbInstance) {
            alert('Por favor, completa todos los campos requeridos (Nombre, Precio, Stock o "Facturar sin stock").');
            return;
        }
        try {
            const productsCollectionRef = collection(dbInstance, `artifacts/${appId}/users/${user.uid}/products`);
            await addDoc(productsCollectionRef, {
                name: newProductName,
                price: parseFloat(newProductPrice),
                stock: newProductNoStock ? -1 : parseInt(newProductStock, 10), // -1 para sin stock
                image: newProductImage, // Guardar la URL de la imagen
                noStock: newProductNoStock, // Guardar el estado de facturar sin stock
                createdAt: serverTimestamp(),
            });
            setNewProductName('');
            setNewProductPrice('');
            setNewProductStock('');
            setNewProductImage('');
            setNewProductNoStock(false);
        } catch (error) {
            console.error("Error al añadir producto:", error);
            alert("Error al añadir el producto. Verifique la consola para más detalles.");
        }
    };

    const updateProduct = async (productId) => {
        if (!editingProduct || !user || !dbInstance) return;
        if (!editingProduct.name || !editingProduct.price || (!editingProduct.noStock && !editingProduct.stock)) {
             alert('Por favor, completa todos los campos requeridos (Nombre, Precio, Stock o "Facturar sin stock").');
            return;
        }
        try {
            const productDocRef = doc(dbInstance, `artifacts/${appId}/users/${user.uid}/products`, productId);
            await updateDoc(productDocRef, {
                name: editingProduct.name,
                price: parseFloat(editingProduct.price),
                stock: editingProduct.noStock ? -1 : parseInt(editingProduct.stock, 10),
                image: editingProduct.image,
                noStock: editingProduct.noStock,
            });
            setEditingProduct(null);
        } catch (error) {
            console.error("Error al actualizar producto:", error);
            alert("Error al actualizar el producto. Verifique la consola para más detalles.");
        }
    };

    const deleteProduct = async (productId) => {
        if (!user || !dbInstance) return;
        try {
            const productDocRef = doc(dbInstance, `artifacts/${appId}/users/${user.uid}/products`, productId);
            await deleteDoc(productDocRef);
        } catch (error) {
            console.error("Error al eliminar producto:", error);
            alert("Error al eliminar el producto. Verifique la consola para más detalles.");
        }
    };

    // --- Funciones de Gestión de Mesas (CRUD) ---
    const addTable = async () => {
        if (!user || !dbInstance) return;
        const newTableName = `Mesa ${tables.length + 1}`;
        try {
            const tablesCollectionRef = collection(dbInstance, `artifacts/${appId}/users/${user.uid}/tables`);
            await addDoc(tablesCollectionRef, {
                name: newTableName,
                status: 'free', // Estado inicial
                order: [],
                orderTotal: 0,
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error al añadir mesa:", error);
            alert("Error al añadir la mesa. Verifique la consola para más detalles.");
        }
    };

    const deleteTable = async (tableId) => {
        if (!user || !dbInstance) return;
        // Confirmación para evitar eliminaciones accidentales
        const confirmation = window.confirm('¿Estás seguro de que quieres eliminar esta mesa? Esto borrará también cualquier pedido asociado.');
        if (!confirmation) return;

        try {
            const tableDocRef = doc(dbInstance, `artifacts/${appId}/users/${user.uid}/tables`, tableId);
            await deleteDoc(tableDocRef);
        } catch (error) {
            console.error("Error al eliminar mesa:", error);
            alert("Error al eliminar la mesa. Verifique la consola para más detalles.");
        }
    };

    const startRenamingTable = (table) => {
        setRenamingTableId(table.id);
        setNewTableNameInput(table.name);
    };

    const handleTableNameChange = (e) => {
        setNewTableNameInput(e.target.value);
    };

    const saveNewTableName = async (tableId) => {
        if (!newTableNameInput.trim() || !user || !dbInstance) {
            alert("El nombre de la mesa no puede estar vacío.");
            return;
        }
        try {
            const tableDocRef = doc(dbInstance, `artifacts/${appId}/users/${user.uid}/tables`, tableId);
            await updateDoc(tableDocRef, {
                name: newTableNameInput.trim(),
                lastUpdate: serverTimestamp()
            });
            alert(`Mesa renombrada a "${newTableNameInput.trim()}" con éxito.`);
            setRenamingTableId(null);
            setNewTableNameInput('');
            // No cerrar el modal de gestión, solo la edición de la fila
        } catch (error) {
            console.error("Error al renombrar mesa:", error);
            alert("Error al renombrar la mesa. Verifique la consola para más detalles.");
        }
    };

    const cancelRenamingTable = () => {
        setRenamingTableId(null);
        setNewTableNameInput('');
    };

    // --- Funciones de Gestión de Pedidos ---
    const addToOrder = (product) => {
        setCurrentOrder(prevOrder => {
            const existingItem = prevOrder.find(item => item.product.id === product.id);
            if (existingItem) {
                return prevOrder.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            } else {
                return [...prevOrder, { product, quantity: 1 }];
            }
        });
    };

    const updateOrderQuantity = (productId, delta) => {
        setCurrentOrder(prevOrder => {
            const updatedOrder = prevOrder.map(item =>
                item.product.id === productId
                    ? { ...item, quantity: item.quantity + delta }
                    : item
            ).filter(item => item.quantity > 0);
            return updatedOrder;
        });
    };

    const removeFromOrder = (productId) => {
        setCurrentOrder(prevOrder => prevOrder.filter(item => item.product.id !== productId));
    };

    const calculateOrderTotal = () => {
        return currentOrder.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    };

    // Cambiado de finalizeOrder a saveOrder
    const saveOrder = async () => {
        if (currentOrder.length === 0) {
            alert('El pedido está vacío. Añade productos antes de guardar.');
            return;
        }
        if (!selectedTable) {
            alert('Por favor, selecciona una mesa para este pedido.');
            return;
        }

        const confirmation = window.confirm(
            `Confirmar pedido para ${selectedTable.name}:\n\n` +
            `Total: $${calculateOrderTotal().toFixed(2)}\n\n` +
            `¿Deseas guardar este pedido como "Pendiente de Pagar"?`
        );

        if (confirmation && dbInstance && user) {
            try {
                const tableDocRef = doc(dbInstance, `artifacts/${appId}/users/${user.uid}/tables`, selectedTable.id);
                // Actualiza el estado de la mesa a 'pendiente-pago' y guarda el pedido
                await updateDoc(tableDocRef, {
                    status: 'pendiente-pago',
                    order: currentOrder.map(item => ({
                        productId: item.product.id,
                        name: item.product.name,
                        price: item.product.price,
                        quantity: item.quantity,
                        image: item.product.image || '', // Incluir imagen en el pedido
                    })),
                    orderTotal: calculateOrderTotal(),
                    lastUpdate: serverTimestamp()
                });

                alert(`Pedido para ${selectedTable.name} guardado como Pendiente de Pagar!`);
                setCurrentOrder([]); // Limpiar el pedido actual
                setSelectedTable(null); // Deseleccionar la mesa
                setCurrentPage('tableOverview'); // Volver a la vista de mesas
            } catch (error) {
                console.error("Error al guardar el pedido:", error);
                alert("Error al guardar el pedido. Verifique la consola para más detalles.");
            }
        }
    };

    // --- New Function to handle showing payment modal ---
    const handleShowPaymentModal = (table) => {
        setCurrentTableForPayment(table);
        setIsGeneratingTicket(false); // Ensure ticket view is off
        setShowPaymentDetailsModal(true);
    };

    // --- New Function to confirm payment and free table (now also records sale) ---
    const handleConfirmPaymentAndFreeTable = async (paymentType, paymentDetails) => {
        if (!currentTableForPayment || !dbInstance || !user) return;

        try {
            const tableDocRef = doc(dbInstance, `artifacts/${appId}/users/${user.uid}/tables`, currentTableForPayment.id);
            const companySettingsRef = doc(dbInstance, `artifacts/${appId}/public/settings/companyInfo/config`);
            const salesRecordsCollectionRef = collection(dbInstance, "salesRecords");

            await runTransaction(dbInstance, async (transaction) => {
                const companyDoc = await transaction.get(companySettingsRef);
                // Ensure companyDoc exists and has nextInvoiceNumber, otherwise default to 1
                const nextInvoiceNum = (companyDoc.exists() && companyDoc.data().nextInvoiceNumber) ? companyDoc.data().nextInvoiceNumber : 1;

                // Record the sale
                const newSaleDocRef = doc(salesRecordsCollectionRef);
                transaction.set(newSaleDocRef, {
                    type: paymentType,
                    ...paymentDetails, // Includes totalPaid, amountReceived, changeGiven, customerName, etc.
                    date: serverTimestamp(),
                    tableId: currentTableForPayment.id,
                    tableName: currentTableForPayment.name,
                    invoiceNumber: nextInvoiceNum, // Use the invoice number that will be used for this transaction
                    processedByUserId: user.uid,
                    processedByDisplayName: displayName,
                    orderItems: currentTableForPayment.order
                    .filter(item => item && item.product) // Asegura que 'item' y 'item.product' existan
                    .map(item => ({
                        name: item.product.name,
                        price: item.product.price,
                        quantity: item.quantity
                    })),
                    originalOrderTotal: currentTableForPayment.orderTotal // This is the base total from the table
                });

                // Update table status
                transaction.update(tableDocRef, {
                    status: 'free',
                    order: [],
                    orderTotal: 0,
                    lastUpdate: serverTimestamp()
                });

                // Update company settings with incremented invoice number
                transaction.update(companySettingsRef, {
                    nextInvoiceNumber: nextInvoiceNum + 1,
                    lastUpdate: serverTimestamp()
                });

                // Update local companySettings state with the new nextInvoiceNumber
                setCompanySettings(prev => ({ ...prev, nextInvoiceNumber: nextInvoiceNum + 1 }));
            });

            alert(`Pago de ${currentTableForPayment.name} completado. Mesa ahora Libre. Venta registrada.`);
            setShowPaymentDetailsModal(false);
            setCurrentTableForPayment(null);
            setCurrentPage('tableOverview'); // Regresar a la pantalla de mesas
        } catch (error) {
            console.error("Error al procesar el pago y registrar la venta:", error);
            alert("Error al procesar el pago. Verifique la consola para más detalles.");
        }
    };


    // --- Funciones de Gestión de Mesas (Interacción) ---
    const handleTableSelectForOrder = (table) => {
        setSelectedTable(table);
        // Si la mesa ya tiene un pedido, cargar ese pedido en currentOrder
        if (table.status === 'pendiente-pago' && table.order) {
            setCurrentOrder(table.order.map(item => ({
                product: products.find(p => p.id === item.productId) || { id: item.productId, name: item.name, price: item.price, image: item.image || '' },
                quantity: item.quantity
            })));
        } else {
            setCurrentOrder([]); // Si está libre, iniciar un nuevo pedido vacío
        }
        // REDIRECT TO ORDER RECEPTION TO ALLOW PRODUCT SELECTION
        setCurrentPage('orderReception');
    };

    // Filtrar productos para la búsqueda
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
    );

    // --- New component for Payment Details and Ticket Preview ---
    const MemoizedPaymentDetailsModal = React.memo(({
        currentTableForPayment,
        isGeneratingTicket,
        setIsGeneratingTicket,
        displayName,
        companySettings,
        handleConfirmPaymentAndFreeTable,
        setShowPaymentDetailsModal
    }) => {
        if (!currentTableForPayment) return null;

        const [paymentSelectionMode, setPaymentSelectionMode] = useState('summary'); // 'summary', 'options', 'cash', 'card', 'credit'
        const [cashReceivedAmount, setCashReceivedAmount] = useState('');
        const [cardPaymentAmount, setCardPaymentAmount] = useState('');
        const [creditCustomerName, setCreditCustomerName] = useState('');
        const [creditPaymentAmount, setCreditPaymentAmount] = useState('');

        const subtotal = currentTableForPayment.orderTotal || 0;
        const tipPercentage = 0.10; // 10%
        const tipAmount = subtotal * tipPercentage;
        const totalToPay = subtotal + tipAmount;

        // Cash calculations
        const received = parseFloat(cashReceivedAmount);
        const change = received - totalToPay;
        const pending = totalToPay - received;
        const canApplyCashPayment = received >= totalToPay;

        // Card calculations
        const cardAmount = parseFloat(cardPaymentAmount);
        // Ensure cardAmount is numeric and positive, and can cover at least some of the total.
        const canApplyCardPayment = !isNaN(cardAmount) && cardAmount > 0;

        // Credit calculations
        const creditAmount = parseFloat(creditPaymentAmount);
        const canApplyCreditPayment = creditCustomerName.trim() !== '' && !isNaN(creditAmount) && creditAmount > 0;

        const handlePrintTicket = () => {
            setIsGeneratingTicket(true);
            // Wait for the DOM to render the printable area before printing
            setTimeout(() => {
                window.print();
                // After print dialog, revert to payment details view
                setIsGeneratingTicket(false);
            }, 500); // Small delay to ensure rendering
        };

        const handleApplyPayment = async (paymentType) => {
            let paymentDetails = {};
            switch (paymentType) {
                case 'cash':
                    paymentDetails = {
                        totalPaid: totalToPay, // The full amount due for the order
                        amountReceived: received,
                        changeGiven: change > 0 ? change : 0,
                        amountPending: pending > 0 ? pending : 0,
                        paymentDescription: `Pago en Efectivo. Recibido: $${received.toFixed(2)}, Vuelto: $${change.toFixed(2)}`
                    };
                    break;
                case 'card':
                    paymentDetails = {
                        totalPaid: cardAmount, // Actual amount paid by card
                        amountReceived: cardAmount,
                        changeGiven: 0,
                        amountPending: (totalToPay - cardAmount) > 0 ? (totalToPay - cardAmount) : 0,
                        paymentDescription: `Pago con Tarjeta. Monto: $${cardAmount.toFixed(2)}`
                    };
                    break;
                case 'credit':
                    paymentDetails = {
                        totalPaid: creditAmount, // Actual amount extended as credit (this is the value of the credit sale)
                        amountReceived: 0, // No cash received directly for this part
                        changeGiven: 0,
                        amountPending: totalToPay - creditAmount, // The remaining balance on the table if partial credit
                        customerName: creditCustomerName.trim(),
                        paymentDescription: `Venta al Crédito a ${creditCustomerName.trim()}. Monto: $${creditAmount.toFixed(2)}`
                    };
                    break;
                default:
                    break;
            }
            await handleConfirmPaymentAndFreeTable(paymentType, paymentDetails);
            // handleConfirmPaymentAndFreeTable will close the modal
        };


        return (
            <div className="modal-overlay">
                <div className="modal-content payment-details-modal">
                    <h3>Detalle del Pedido para {currentTableForPayment.name}</h3>

                    {/* Conditional rendering for ticket preview is here */}
                    {isGeneratingTicket ? (
                        // Ticket Print Preview
                        <div className="ticket-print-preview printable-area">
                            <div className="text-center mb-4">
                                {companySettings.logoUrl && (
                                    <img src={companySettings.logoUrl} alt="Logo Empresa" className="company-logo mx-auto mb-2" />
                                )}
                                <h4 className="text-xl font-bold">{companySettings.name}</h4>
                                {/* Display the invoice number that was *just used* for this transaction. This is the nextInvoiceNumber from settings MINUS 1. */}
                                <p className="text-sm">Factura Nº: {companySettings.nextInvoiceNumber - 1}</p>
                            </div>

                            <h5 className="text-lg font-semibold mb-2">Detalle del Pedido</h5>
                            <ul className="ticket-items-list mb-2">
                                {currentTableForPayment.order && currentTableForPayment.order.map((item, index) => (
                                    <li key={index} className="flex justify-between text-sm mb-1">
                                        <span>{item.name} (x{item.quantity})</span>
                                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="ticket-summary">
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span>Subtotal:</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium mb-1">
                                    <span>Propina Voluntaria (10%):</span>
                                    <span>${tipAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold mt-2 border-t pt-2">
                                    <span>Total:</span>
                                    <span>${totalToPay.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="mt-4 text-center text-sm">
                                <p>Mesa: {currentTableForPayment.name}</p>
                                <p>Mesero: {displayName}</p>
                                <p className="mt-2 text-md font-semibold">"Gracias por su visita, te esperamos nuevamente"</p>
                            </div>
                             {/* The "Cerrar Vista Previa" button is now outside the printable area to avoid being printed */}
                            <div className="flex justify-center mt-4 hide-on-print">
                                <button className="secondary-button" onClick={() => setIsGeneratingTicket(false)}>
                                    Cerrar Vista Previa
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Payment details view (when not generating ticket)
                        <>
                            <div className="order-details-summary">
                                <h4>Items del Pedido:</h4>
                                <ul className="order-summary-items-list">
                                    {currentTableForPayment.order && currentTableForPayment.order.map((item, index) => (
                                         // Agrega esta validación para asegurarte de que 'item' existe antes de intentar usarlo
                                         item ? (
                                        <li key={index} className="flex justify-between text-sm mb-1">
                                            <span>{item.name} (x{item.quantity})</span>
                                            <span>${(item.price * item.quantity).toFixed(2)}</span>
                                        </li>
                                        ) : null // Si 'item' no existe, no renderices nada
                                    ))}
                                </ul>
                                <div className="summary-line">
                                    <span>Subtotal:</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="summary-line tip-line">
                                    <span>Propina Voluntaria (10%):</span>
                                    <span>${tipAmount.toFixed(2)}</span>
                                </div>
                                <div className="summary-line total-line">
                                    <span>Total a Pagar:</span>
                                    <span>${totalToPay.toFixed(2)}</span>
                                </div>
                            </div>

                            {paymentSelectionMode === 'summary' && (
                                <div className="modal-buttons payment-buttons">
                                    <button className="primary-button" onClick={() => setPaymentSelectionMode('options')}>
                                        Facturar
                                    </button>
                                    <button className="secondary-button" onClick={() => setShowPaymentDetailsModal(false)}>
                                        Cancelar
                                    </button>
                                </div>
                            )}

                            {paymentSelectionMode === 'options' && (
                                <div className="modal-buttons payment-buttons flex-col">
                                    <button className="primary-button" onClick={() => setPaymentSelectionMode('cash')}>
                                        Efectivo
                                    </button>
                                    <button className="primary-button" onClick={() => { setCardPaymentAmount(totalToPay.toFixed(2)); setPaymentSelectionMode('card'); }}>
                                        Tarjetas de Crédito/Débito
                                    </button>
                                    <button className="primary-button" onClick={() => { setCreditPaymentAmount(totalToPay.toFixed(2)); setPaymentSelectionMode('credit'); }}>
                                        Ventas al Crédito
                                    </button>
                                    <button className="secondary-button" onClick={() => setPaymentSelectionMode('summary')}>
                                        Volver
                                    </button>
                                </div>
                            )}

                            {paymentSelectionMode === 'cash' && (
                                <div className="payment-method-section">
                                    <h4 className="payment-method-title">Pago en Efectivo</h4>
                                    <div className="form-group">
                                        <label htmlFor="cashReceived" className="form-label">Valor Recibido ($)</label>
                                        <input
                                            id="cashReceived"
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={cashReceivedAmount}
                                            onChange={(e) => setCashReceivedAmount(e.target.value)}
                                            placeholder="Ingrese el monto recibido"
                                        />
                                    </div>
                                    {cashReceivedAmount !== '' && (
                                        <p style={{ color: change >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                                            {change >= 0 ? `Vuelto a entregar: $${change.toFixed(2)}` : `Pendiente de pagar: $${Math.abs(pending).toFixed(2)}`}
                                        </p>
                                    )}
                                    <div className="modal-buttons">
                                        <button className="primary-button" onClick={() => handleApplyPayment('cash')} disabled={!canApplyCashPayment}>
                                            Aplicar Pago
                                        </button>
                                        <button className="secondary-button" onClick={() => setPaymentSelectionMode('options')}>
                                            Volver
                                        </button>
                                    </div>
                                </div>
                            )}

                            {paymentSelectionMode === 'card' && (
                                <div className="payment-method-section">
                                    <h4 className="payment-method-title">Pago con Tarjeta</h4>
                                    <div className="form-group">
                                        <label htmlFor="cardAmount" className="form-label">Monto con Tarjeta ($)</label>
                                        <input
                                            id="cardAmount"
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={cardPaymentAmount}
                                            onChange={(e) => setCardPaymentAmount(e.target.value)}
                                            placeholder="Ingrese el monto a pagar con tarjeta"
                                        />
                                    </div>
                                    <div className="modal-buttons">
                                        <button className="primary-button" onClick={() => handleApplyPayment('card')} disabled={!canApplyCardPayment}>
                                            Aplicar Pago
                                        </button>
                                        <button className="secondary-button" onClick={() => setPaymentSelectionMode('options')}>
                                            Volver
                                        </button>
                                    </div>
                                </div>
                            )}

                            {paymentSelectionMode === 'credit' && (
                                <div className="payment-method-section">
                                    <h4 className="payment-method-title">Ventas al Crédito</h4>
                                    <div className="form-group">
                                        <label htmlFor="creditCustomerName" className="form-label">Nombre del Cliente</label>
                                        <input
                                            id="creditCustomerName"
                                            type="text"
                                            className="form-input"
                                            value={creditCustomerName}
                                            onChange={(e) => setCreditCustomerName(e.target.value)}
                                            placeholder="Ingrese el nombre del cliente"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="creditAmount" className="form-label">Monto al Crédito ($)</label>
                                        <input
                                            id="creditAmount"
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={creditPaymentAmount}
                                            onChange={(e) => setCreditPaymentAmount(e.target.value)}
                                            placeholder="Ingrese el monto a aplicar al crédito"
                                        />
                                    </div>
                                    <div className="modal-buttons">
                                        <button className="primary-button" onClick={() => handleApplyPayment('credit')} disabled={!canApplyCreditPayment}>
                                            Aplicar Pago
                                        </button>
                                        <button className="secondary-button" onClick={() => setPaymentSelectionMode('options')}>
                                            Volver
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* Botón "Mostrar Ticket" disponible en cualquier momento para el resumen no de pago. */}
                            {paymentSelectionMode === 'summary' && (
                                <div className="flex justify-center mt-4">
                                     <button className="secondary-button" onClick={handlePrintTicket}>
                                        <i className="fas fa-print mr-2"></i> Mostrar Ticket
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    });

    // --- Component for central table renaming management ---
    const RenameTableManagementModal = () => {
        return (
            <div className="modal-overlay">
                <div className="modal-content rename-management-modal">
                    <h3>Gestionar Nombres de Mesas</h3>
                    {tables.length === 0 ? (
                        <p>No hay mesas para renombrar.</p>
                    ) : (
                        <ul className="table-rename-list">
                            {tables.map(table => (
                                <li key={table.id} className="flex justify-between items-center py-2 border-b border-gray-200">
                                    {renamingTableId === table.id ? (
                                        <div className="flex-grow flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newTableNameInput}
                                                onChange={handleTableNameChange}
                                                className="form-input flex-grow"
                                            />
                                            <button
                                                className="primary-button small-button"
                                                onClick={() => saveNewTableName(table.id)}
                                            >
                                                Guardar
                                            </button>
                                            <button
                                                className="secondary-button small-button"
                                                onClick={cancelRenamingTable}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center flex-grow">
                                            <span>{table.name}</span>
                                            <button
                                                className="edit-button small-button"
                                                onClick={() => startRenamingTable(table)}
                                            >
                                                Editar
                                            </button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="modal-buttons mt-4">
                        <button className="secondary-button" onClick={() => setShowRenameTableManagementModal(false)}>Cerrar</button>
                    </div>
                </div>
            </div>
        );
    };


    // --- Renderizado Condicional de Páginas ---
    const renderPage = () => {
        if (loading) {
            return (
                <div className="loading-container">
                    <p>Cargando aplicación...</p>
                </div>
            );
        }

        if (!user) {
            // Mostrar la interfaz de elección de autenticación o el formulario de login de admin
            switch (authMode) {
                case 'choice':
                    return (
                        <div className="auth-choice-container">
                            <h2>Bienvenido a DarkPedidos POS</h2>
                            <p>¿Cómo desea continuar?</p>
                            <button className="primary-button" onClick={handleAnonymousLogin}>
                                Continuar como Invitado
                            </button>
                            <button className="secondary-button" onClick={() => setAuthMode('admin_login')}>
                                Iniciar Sesión como Administrador
                            </button>
                        </div>
                    );
                case 'admin_login':
                    return (
                        <div className="admin-login-container">
                            <h2>Iniciar Sesión Administrador</h2>
                            <div className="form-group">
                                <label htmlFor="adminEmail" className="form-label">Email</label>
                                <input
                                    id="adminEmail"
                                    type="email"
                                    className="form-input"
                                    value={adminEmail}
                                    onChange={(e) => setAdminEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="adminPassword" className="form-label">Contraseña</label>
                                <input
                                    id="adminPassword"
                                    type="password"
                                    className="form-input"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    placeholder="********"
                                />
                            </div>
                            <button className="primary-button" onClick={handleAdminLogin}>
                                Iniciar Sesión
                            </button>
                            <button className="secondary-button" onClick={() => setAuthMode('choice')} style={{marginTop: '10px'}}>
                                Volver
                            </button>
                        </div>
                    );
                default:
                    return (
                        <div className="error-container">
                            <h2>Acceso Requerido</h2>
                            <p>No se pudo autenticar al usuario. Intente recargar la página o elija una opción.</p>
                        </div>
                    );
            }
        }

        const currentUserId = user.uid; // Puedes usar esto en algún lugar si lo necesitas

        switch (currentPage) {
            case 'dashboard':
                return (
                    <div className="page-content">
                        <h2 className="page-title">Dashboard</h2>
                        <div className="dashboard-grid">
                            {/* REMOVED: Botón de Recepción de Pedidos */}
                            <div className="dashboard-card green">
                                <h3>Visualización de Mesas</h3>
                                <p>Consulta el estado de las mesas y su ocupación.</p>
                                <button className="dashboard-card-button" onClick={() => setCurrentPage('tableOverview')}>
                                    Ir a Mesas
                                </button>
                            </div>
                            <div className="dashboard-card purple">
                                <h3>Gestión de Productos</h3>
                                <p>Administra tu inventario y productos disponibles.</p>
                                <button className="dashboard-card-button" onClick={() => setCurrentPage('productManagement')}>
                                    Ir a Productos
                                </button>
                            </div>
                            <div className="dashboard-card yellow">
                                <h3>Reportes de Ventas</h3>
                                <p>Análisis detallado de tus ventas.</p>
                                <button className="dashboard-card-button" onClick={() => setCurrentPage("reportes")}>
                                Ver Reportes
                                </button>
                            </div>
                                                        <div className="dashboard-card red">
                                                                <h3>Contabilidad y Nómina</h3>
                                                                <p>Control financiero y de personal.</p>
                                                                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                                                    <button className="dashboard-card-button" onClick={() => { setContabilidadTab('registros'); setCurrentPage('contabilidad'); }}>
                                                                        Ir a Contabilidad
                                                                    </button>
                                                                    <button className="dashboard-card-button" onClick={() => { setContabilidadTab('nomina'); setCurrentPage('contabilidad'); }}>
                                                                        Ir a Nómina
                                                                    </button>
                                                                </div>
                                                        </div>
                            <div className="dashboard-card teal">
                                <h3>Facturación y Pagos</h3>
                                <p>Procesa pagos y genera facturas.</p>
                            </div>
                        </div>
                    </div>
                );
            case "reportes":
                return <Reportes db={dbInstance} 
                />;
            case 'contabilidad':
                return <Contabilidad initialTab={contabilidadTab} />;
                
            case "configuraciones":
                return <Configuraciones db={dbInstance} />;    

            case 'productManagement':
                // Solo administradores pueden gestionar productos
                if (role !== 'admin') {
                    return (
                        <div className="page-content">
                            <h2 className="page-title">Acceso Denegado</h2>
                            <p>No tienes permiso para acceder a esta sección.</p>
                        </div>
                    );
                }
                return (
                    <div className="page-content">
                        <h2 className="page-title">Gestión de Productos</h2>

                        {/* Formulario para Añadir/Editar Producto */}
                        <div className="add-product-form">
                            <h3>{editingProduct ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h3>
                            <div className="form-group">
                                <label htmlFor="productName" className="form-label">Nombre del Producto</label>
                                <input
                                    id="productName"
                                    type="text"
                                    className="form-input"
                                    placeholder="Nombre del Producto"
                                    value={editingProduct ? editingProduct.name : newProductName}
                                    onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, name: e.target.value }) : setNewProductName(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="productPrice" className="form-label">Precio</label>
                                <input
                                    id="productPrice"
                                    type="number"
                                    className="form-input"
                                    placeholder="Precio"
                                    value={editingProduct ? editingProduct.price : newProductPrice}
                                    onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, price: e.target.value }) : setNewProductPrice(e.target.value)}
                                />
                            </div>
                             <div className="form-group">
                                <label htmlFor="productImage" className="form-label">URL de la Imagen</label>
                                <input
                                    id="productImage"
                                    type="text"
                                    className="form-input"
                                    placeholder="URL de la imagen del producto (opcional)"
                                    value={editingProduct ? editingProduct.image : newProductImage}
                                    onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, image: e.target.value }) : setNewProductImage(e.target.value)}
                                />
                            </div>
                            <div className="form-group flex items-center justify-between"> {/* Flexbox para alinear checkbox y label */}
                                <div className="flex items-center">
                                    <input
                                        id="noStockCheckbox"
                                        type="checkbox"
                                        className="form-checkbox"
                                        checked={editingProduct ? editingProduct.noStock : newProductNoStock}
                                        onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, noStock: e.target.checked }) : setNewProductNoStock(e.target.checked)}
                                    />
                                    <label htmlFor="noStockCheckbox" className="form-label" style={{ marginBottom: 0, marginLeft: '8px' }}>Facturar sin Stock</label>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="productStock" className="form-label">Stock</label>
                                <input
                                    id="productStock"
                                    type="number"
                                    className="form-input"
                                    placeholder="Stock"
                                    value={editingProduct ? editingProduct.stock === -1 ? '' : editingProduct.stock : newProductStock}
                                    onChange={(e) => editingProduct ? setEditingProduct({ ...editingProduct, stock: e.target.value }) : setNewProductStock(e.target.value)}
                                    disabled={editingProduct ? editingProduct.noStock : newProductNoStock} // Deshabilitar si "Facturar sin Stock" está marcado
                                />
                            </div>
                            <div className="form-group">
                                <button
                                    className="primary-button"
                                    onClick={editingProduct ? () => updateProduct(editingProduct.id) : addProduct}
                                >
                                    {editingProduct ? 'Guardar Cambios' : 'Añadir Producto'}
                                </button>
                                {editingProduct && (
                                    <button
                                        className="secondary-button"
                                        style={{ marginLeft: '10px' }}
                                        onClick={() => setEditingProduct(null)}
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Lista de Productos */}
                        <h3>Productos en Inventario</h3>
                        {products.length === 0 ? (
                            <p>No hay productos en el inventario.</p>
                        ) : (
                            <div className="product-grid">
                                {products.map((product) => (
                                    <div key={product.id} className="product-item">
                                        {product.image && (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="product-image"
                                                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/120x120/CCCCCC/666666?text=${product.name.substring(0,4)}`; }}
                                            />
                                        )}
                                        {!product.image && (
                                            <img
                                                src={`https://placehold.co/120x120/CCCCCC/666666?text=${product.name.substring(0,4)}`}
                                                alt={product.name}
                                                className="product-image"
                                            />
                                        )}
                                        <h3>{product.name}</h3>
                                        <p>Precio: <span className="price">${product.price.toFixed(2)}</span></p>
                                        <p>Stock: {product.noStock ? 'Sin control de stock' : product.stock}</p>
                                        <div className="product-actions">
                                            <button className="edit-button" onClick={() => setEditingProduct(product)}>Editar</button>
                                            <button className="delete-button" onClick={() => deleteProduct(product.id)}>Eliminar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'orderReception': // THIS PAGE IS NOW DEFUNCT BUT THE BUTTONS WILL STILL NAVIGATE TO IT FOR PRODUCT SELECTION
                return (
                    <div className="page-content">
                        <h2 className="page-title">Recepción de Pedidos</h2>

                        <div className="order-reception-layout">
                            {/* Panel de Selección de Productos */}
                            <div className="product-selection-panel">
                                <h3>Seleccionar Productos</h3>
                                <input
                                    type="text"
                                    className="product-search"
                                    placeholder="Buscar producto..."
                                    value={productSearchTerm}
                                    onChange={(e) => setProductSearchTerm(e.target.value)}
                                />
                                <div className="order-product-list">
                                    {filteredProducts.length === 0 ? (
                                        <p>No se encontraron productos.</p>
                                    ) : (
                                        filteredProducts.map(product => (
                                            <div
                                                key={product.id}
                                                className={`order-product-card ${currentOrder.some(item => item.product.id === product.id) ? 'selected' : ''}`}
                                                onClick={() => addToOrder(product)}
                                            >
                                                <img
                                                    src={product.image || `https://placehold.co/100x100/CCCCCC/666666?text=${product.name.substring(0,4)}`}
                                                    alt={product.name}
                                                    onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/100x100/CCCCCC/666666?text=${product.name.substring(0,4)}`; }}
                                                />
                                                <h4>{product.name}</h4>
                                                <p className="price">${product.price.toFixed(2)}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Panel de Resumen del Pedido */}
                            <div className="order-summary-panel">
                                <h3>Resumen del Pedido</h3>
                                <div className="selected-table-info">
                                    {selectedTable && <p>Mesa seleccionada: <strong>{selectedTable.name}</strong></p>}
                                </div>
                                <div className="order-items-section"> {/* Nueva sección para los items del pedido */}
                                    <ul className="order-items-list">
                                        {currentOrder.length === 0 ? (
                                            <li>El pedido está vacío.</li>
                                        ) : (
                                            currentOrder.map(item => (
                                                <li key={item.product.id} className="order-item">
                                                    <div className="order-item-details">
                                                        <span className="order-item-name-summary">{item.product.name} (x{item.quantity})</span>
                                                    </div>
                                                    <div className="order-item-actions-group"> {/* Nuevo contenedor para agrupar botones y precio */}
                                                        <span className="order-item-total-price">${(item.product.price * item.quantity).toFixed(2)}</span>
                                                        <button className="quantity-button" onClick={() => updateOrderQuantity(item.product.id, -1)}>-</button>
                                                        <button className="quantity-button" onClick={() => updateOrderQuantity(item.product.id, 1)}>+</button>
                                                        <button className="remove-item-button" onClick={() => removeFromOrder(item.product.id)}>
                                                            <i className="fas fa-trash-alt"></i> {/* Icono de bote de basura */}
                                                        </button>
                                                    </div>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                </div> {/* Fin de la nueva sección */}
                                <div className="order-summary-total">
                                    Total: ${calculateOrderTotal().toFixed(2)}
                                </div>
                                {/* Cambiado de Finalizar Pedido a Guardar Pedido */}
                                <button className="checkout-order-button" onClick={saveOrder}>
                                    Guardar Pedido
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'tableOverview':
                return (
                    <div className="page-content">
                        <h2 className="page-title">Visualización de Mesas</h2>
                        <div className="table-actions-container">
                            <button className="primary-button" onClick={addTable}>Añadir Mesa</button>
                            {/* Botón para abrir el modal de gestión de renombrado de mesas */}
                            <button className="secondary-button" onClick={() => setShowRenameTableManagementModal(true)}>
                                Renombrar Mesas
                            </button>
                            {/* Botón de eliminar última mesa, ahora solo visible para administradores */}
                            {tables.length > 0 && role === 'admin' && (
                                <button className="delete-button" onClick={() => deleteTable(tables[tables.length - 1].id)}>
                                    Eliminar Última Mesa
                                </button>
                            )}
                        </div>
                        {tables.length === 0 ? (
                            <p style={{textAlign: 'center', marginTop: '20px', fontSize: '1.1em', color: '#555'}}>No hay mesas. Añade una mesa para empezar.</p>
                        ) : (
                            <div className="tables-grid">
                                {tables.map(table => (
                                    <div
                                        key={table.id}
                                        className={`table-card ${table.status} ${selectedTable && selectedTable.id === table.id ? 'selected' : ''}`}
                                    >
                                        <h3>{table.name}</h3>
                                        <p>Estado: {table.status === 'free' ? 'Libre' : 'Pendiente de Pagar'}
                                            <span className={`status-indicator ${table.status}`}></span>
                                        </p>
                                        {table.status === 'pendiente-pago' && table.orderTotal > 0 && (
                                            <>
                                                <p className="order-total-display">Total: ${table.orderTotal.toFixed(2)}</p>
                                                <button
                                                    className="complete-payment-button" /* Renombrado del CSS */
                                                    onClick={(e) => { e.stopPropagation(); handleShowPaymentModal(table); }} // Abre el modal de pago
                                                >
                                                    Facturar
                                                </button>
                                            </>
                                        )}
                                        {/* Nuevo botón "Agregar Pedido" */}
                                        <button
                                            className="add-order-button"
                                            onClick={(e) => { e.stopPropagation(); handleTableSelectForOrder(table); }}
                                        >
                                            Agregar Pedido
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <div className="page-content">
                        <h2 className="page-title">Página No Encontrada</h2>
                        <p>La página que intentas acceder no existe.</p>
                    </div>
                );
        }
    };

    return (
        <div>
            {/* CSS incrustado aquí */}
            <style>
                {`
                    /* --- Font Awesome for icons --- */
                    @import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css");
                    /* --- Fuentes y Estilos Globales --- */
                    body {
                        font-family: 'Inter', sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f0f2f5; /* Fondo general más suave */
                        color: #333;
                        line-height: 1.6;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                        display: flex;
                        flex-direction: column;
                        min-height: 100vh;
                    }

                    .container {
                        max-width: 1200px;
                        margin: 20px auto;
                        padding: 0 15px;
                        flex-grow: 1;
                        width: 100%; /* Asegura que ocupe todo el ancho disponible */
                        box-sizing: border-box; /* Incluye padding y border en el ancho total */
                    }

                    /* --- Header --- */
                    header {
                        background-color: #2c3e50; /* Azul oscuro */
                        color: white;
                        padding: 15px 0;
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        width: 100%; /* El header ocupa todo el ancho de la pantalla */
                    }

                    .header-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        max-width: 1200px;
                        margin: 0 auto;
                        padding: 0 15px;
                        width: 100%; /* Asegura que el contenido del header respete el ancho del contenedor principal */
                        box-sizing: border-box; /* Incluye padding en el ancho total */
                    }

                    .header-title {
                        margin: 0;
                        font-size: 2.2em;
                        font-weight: 700;
                    }

                    .nav-menu {
                        display: flex;
                        gap: 25px;
                        align-items: center;
                    }

                    .nav-button {
                        background: none;
                        border: none;
                        color: white;
                        padding: 8px 12px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 1.05em;
                        font-weight: 500;
                        transition: background-color 0.3s ease, color 0.3s ease;
                    }

                    .nav-button:hover {
                        background-color: #34495e; /* Un tono más claro del azul oscuro */
                        color: #ecf0f1;
                    }

                    .nav-button.active {
                        background-color: #3498db; /* Azul de énfasis */
                        font-weight: 600;
                    }

                    .user-info {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        background-color: #34495e; /* Gris más oscuro para info de usuario */
                        border-radius: 20px;
                        padding: 5px 10px; /* Reducir padding */
                        font-size: 0.75em; /* Reducir tamaño de fuente */
                        color: #ecf0f1;
                    }

                    .user-info span:first-child {
                        color: #bdc3c7;
                    }

                    .user-info span:last-child {
                        font-weight: 600;
                    }

                    .edit-profile-button {
                        background-color: #f39c12; /* Naranja para editar perfil */
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 15px;
                        cursor: pointer;
                        font-size: 0.75em; /* Tamaño de fuente más pequeño */
                        font-weight: 500;
                        transition: background-color 0.3s ease;
                    }
                    .edit-profile-button:hover {
                        background-color: #e67e22;
                    }

                    .logout-button {
                        background-color: #e74c3c; /* Rojo para cerrar sesión */
                        color: white;
                        padding: 8px 15px;
                        border-radius: 20px;
                        font-weight: 600;
                        transition: background-color 0.3s ease, box-shadow 0.3s ease;
                        border: none;
                        cursor: pointer;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        width: auto; /* Ajustar el ancho para que no ocupe todo el marco */
                        min-width: 120px; /* Asegurar un ancho mínimo */
                        text-align: center;
                    }

                    .logout-button:hover {
                        background-color: #c0392b;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                    }

                    /* --- Loader y Error --- */
                    .loading-container, .error-container {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: calc(100vh - 100px); /* Ajusta por la altura del header/footer */
                        font-size: 1.5em;
                        color: #555;
                        text-align: center;
                    }

                    .error-container h2 {
                        color: #e74c3c;
                    }

                    /* --- Layout de la Página --- */
                    .page-content {
                        padding: 20px;
                        background-color: #fff;
                        border-radius: 8px;
                        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
                        margin-bottom: 20px;
                    }

                    .page-title {
                        font-size: 2em;
                        font-weight: 700;
                        color: #2c3e50;
                        margin-bottom: 25px;
                        padding-bottom: 10px;
                        border-bottom: 2px solid #ecf0f1;
                    }

                    /* --- Dashboard --- */
                    .dashboard-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                        gap: 25px;
                    }

                    .dashboard-card {
                        padding: 25px;
                        border-radius: 10px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                        color: white;
                        transition: transform 0.3s ease, box-shadow 0 3s ease;
                    }

                    .dashboard-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
                    }

                    .dashboard-card.blue { background-color: #3498db; }
                    .dashboard-card.green { background-color: #2ecc71; }
                    .dashboard-card.purple { background-color: #9b59b6; }
                    .dashboard-card.yellow { background-color: #f1c40f; }
                    .dashboard-card.red { background-color: #e74c3c; }
                    .dashboard-card.teal { background-color: #1abc9c; }

                    .dashboard-card h3 {
                        margin-top: 0;
                        font-size: 1.5em;
                        font-weight: 600;
                        margin-bottom: 10px;
                    }

                    .dashboard-card p {
                        font-size: 1em;
                        margin-bottom: 15px;
                    }

                    .dashboard-card-button {
                        background-color: rgba(255, 255, 255, 0.2);
                        border: 1px solid rgba(255, 255, 255, 0.5);
                        color: white;
                        padding: 10px 20px;
                        border-radius: 20px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: background-color 0.3s ease, border-color 0.3s ease;
                    }

                    .dashboard-card-button:hover {
                        background-color: rgba(255, 255, 255, 0.4);
                        border-color: white;
                    }

                    .coming-soon-text {
                        font-size: 0.9em;
                        opacity: 0.8;
                        margin-top: 10px;
                    }

                    /* --- Formularios y Controles (General) --- */
                    .form-group {
                        margin-bottom: 15px;
                    }

                    .form-label {
                        display: block;
                        margin-bottom: 5px;
                        font-weight: 600;
                        color: #555;
                    }

                    .form-input, .form-select {
                        width: calc(100% - 22px); /* Ajusta por padding y border */
                        padding: 10px;
                        border: 1px solid #ccc;
                        border-radius: 5px;
                        font-size: 1em;
                        transition: border-color 0.3s ease, box-shadow 0.3s ease;
                    }

                    .form-input:focus, .form-select:focus {
                        border-color: #3498db;
                        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
                        outline: none;
                    }
                    /* Checkbox para facturar sin stock */
                    .form-checkbox {
                        width: 18px;
                        height: 18px;
                        margin-right: 5px;
                        border-radius: 3px;
                        border: 1px solid #ccc;
                        cursor: pointer;
                        vertical-align: middle;
                        -webkit-appearance: none;
                        -moz-appearance: none;
                        appearance: none;
                        outline: none;
                        transition: background-color 0.2s ease, border-color 0.2s ease;
                    }

                    .form-checkbox:checked {
                        background-color: #3498db;
                        border-color: #3498db;
                    }
                     .form-checkbox:focus {
                        box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
                     }


                    .primary-button {
                        background-color: #3498db;
                        color: white;
                        padding: 10px 20px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 1em;
                        font-weight: 600;
                        transition: background-color 0.3s ease, transform 0.2s ease;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    }

                    .primary-button:hover {
                        background-color: #2980b9;
                        transform: translateY(-1px);
                    }

                    .secondary-button {
                        background-color: #95a5a6;
                        color: white;
                        padding: 8px 15px;
                        border: none;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 0.9em;
                        transition: background-color 0.3s ease;
                    }

                    .secondary-button:hover {
                        background-color: #7f8c8d;
                    }

                    /* --- Product Management --- */
                    .product-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin-top: 20px;
                    }

                    .product-item {
                        background-color: #fcfcfc;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        padding: 15px;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
                        display: flex;
                        flex-direction: column;
                        align-items: center; /* Centrar contenido */
                        text-align: center;
                    }

                    .product-image {
                        width: 120px; /* Tamaño mediano ajustado */
                        height: 120px; /* Tamaño mediano ajustado */
                        object-fit: cover;
                        border-radius: 4px;
                        margin-bottom: 10px;
                        border: 1px solid #eee;
                    }

                    .product-item h3 {
                        margin-top: 0;
                        color: #3498db;
                        font-size: 1.2em;
                        font-weight: 600;
                    }

                    .product-item p {
                        margin: 5px 0;
                        font-size: 0.95em;
                        color: #555;
                    }

                    .product-item .price {
                        font-weight: 700;
                        color: #2ecc71;
                        font-size: 1.1em;
                    }

                    .product-actions {
                        margin-top: 15px;
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    }

                    .edit-button {
                        background-color: #f39c12; /* Naranja */
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 5px;
                        cursor: pointer;
                        transition: background-color 0.3s ease;
                    }

                    .edit-button:hover {
                        background-color: #e67e22;
                    }

                    .delete-button {
                        background-color: #e74c3c; /* Rojo */
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 5px;
                        cursor: pointer;
                        transition: background-color 0.3s ease;
                    }

                    .delete-button:hover {
                        background-color: #c0392b;
                    }

                    .add-product-form {
                        background-color: #f9f9f9;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 30px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    }

                    .add-product-form h3 {
                        font-size: 1.5em;
                        color: #2c3e50;
                        margin-top: 0;
                        margin-bottom: 20px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid #e0e0e0;
                    }

                    /* --- Order Reception --- */
                    .order-reception-layout {
                        display: flex;
                        gap: 20px;
                        flex-wrap: wrap; /* Para responsividad */
                    }

                    .product-selection-panel {
                        flex: 2;
                        min-width: 300px;
                        background-color: #f9f9f9;
                        border-radius: 8px;
                        padding: 20px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    }

                    .order-summary-panel {
                        flex: 1;
                        min-width: 340px; /* Aumentado el min-width para más espacio */
                        background-color: #f9f9f9;
                        border-radius: 8px;
                        padding: 20px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                        position: sticky;
                        top: 20px;
                        align-self: flex-start;
                    }

                    .product-search {
                        width: calc(100% - 22px);
                        padding: 10px;
                        border: 1px solid #ccc;
                        border-radius: 5px;
                        margin-bottom: 15px;
                    }

                    .order-product-list {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); /* 10x10 cards */
                        gap: 15px;
                        margin-top: 15px;
                        max-height: 400px; /* Para scroll si hay muchos productos */
                        overflow-y: auto;
                        padding-right: 5px;
                    }

                    .order-product-card {
                        background-color: #ecf0f1; /* Fondo claro */
                        border: 1px solid #bdc3c7;
                        border-radius: 8px;
                        padding: 10px;
                        text-align: center;
                        cursor: pointer;
                        transition: background-color 0.2s ease, transform 0.2s ease;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        height: 170px; /* Altura fija para la tarjeta para mantener el aspecto */
                    }

                    .order-product-card:hover {
                        background-color: #dfe6e9;
                        transform: translateY(-2px);
                    }

                    .order-product-card.selected {
                        border: 2px solid #3498db;
                        background-color: #d6eaf8; /* Más azulado si está seleccionado */
                    }

                    .order-product-card img {
                        width: 100px; /* Tamaño de imagen de 10x10 */
                        height: 100px; /* Tamaño de imagen de 10x10 */
                        object-fit: contain;
                        margin: 0 auto 5px auto; /* Centrar y margen inferior */
                        border-radius: 4px;
                    }

                    .order-product-card h4 {
                        margin: 5px 0;
                        font-size: 0.9em; /* Reducir tamaño de fuente */
                        color: #2c3e50;
                    }

                    .order-product-card .price {
                        font-weight: 700;
                        color: #2ecc71;
                        font-size: 0.9em; /* Reducir tamaño de fuente */
                    }

                    .selected-table-info {
                        padding-bottom: 15px;
                        border-bottom: 1px dashed #e0e0e0;
                        margin-bottom: 15px;
                    }

                    .order-items-section {
                        /* Separación visible de la sección de elementos del pedido */
                        padding-bottom: 15px;
                        border-bottom: 1px solid #cfd8dc; /* Línea de separación más sólida */
                        margin-bottom: 15px;
                    }

                    .order-items-list {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                        max-height: 300px; /* Altura máxima para desplazamiento vertical */
                        overflow-y: auto;
                        overflow-x: hidden; /* Ocultar desplazamiento horizontal */
                        padding-right: 5px;
                    }

                    .order-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 0;
                        border-bottom: 1px solid #f0f2f5;
                        gap: 10px;
                    }
                     .order-item-image {
                        display: none; /* Eliminar la imagen del resumen del pedido */
                    }
                    .order-item-details {
                        display: flex;
                        align-items: center;
                        flex-grow: 1; /* Permite que los detalles ocupen el espacio restante */
                        gap: 10px;
                        min-width: 100px; /* Asegura un ancho mínimo para el detalle */
                    }
                    .order-item-name-summary { /* Nuevo estilo para el nombre del producto en el resumen */
                        flex-grow: 1; /* Permite que el nombre ocupe el espacio restante */
                        text-align: left;
                        font-weight: 600;
                        color: #333;
                        white-space: normal; /* Permitir que el texto se divida en varias líneas */
                        word-wrap: break-word; /* Romper palabras largas si es necesario */
                        font-size: 0.85em; /* Reducir tamaño de fuente */
                    }
                    .order-item-quantity {
                        margin-left: 5px;
                        color: #666;
                        font-size: 0.9em;
                    }


                    .order-item:last-child {
                        border-bottom: none;
                    }

                    .order-item-actions-group { /* Nuevo contenedor para agrupar botones y precio */
                        display: flex;
                        align-items: center;
                        gap: 8px; /* Reducir el gap para que los botones estén más juntos */
                        flex-shrink: 0; /* Evita que el grupo de acciones se encoja */
                    }
                    .order-item-total-price {
                        font-weight: 700;
                        color: #2c3e50;
                        min-width: 60px; /* Asegurar espacio para el total */
                        text-align: right;
                        font-size: 0.85em; /* Reducir tamaño de fuente */
                    }

                    .quantity-button {
                        background-color: #3498db;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        width: 32px; /* Ajustado el tamaño de los botones */
                        height: 32px; /* Ajustado el tamaño de los botones */
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.9em; /* Ajustado el tamaño de fuente */
                        transition: background-color 0.2s ease;
                        flex-shrink: 0; /* Evita que el botón se encoja */
                    }

                    .quantity-button:hover {
                        background-color: #2980b9;
                    }

                    .remove-item-button {
                        background-color: #e74c3c;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        width: 32px; /* Ajustado el tamaño de los botones */
                        height: 32px; /* Ajustado el tamaño de los botones */
                        padding: 0; /* Quitar padding para que el icono tome el tamaño */
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        cursor: pointer;
                        font-size: 0.9em; /* Ajustado el tamaño de fuente del icono */
                        transition: background-color 0.2s ease;
                        flex-shrink: 0;
                    }

                    .remove-item-button:hover {
                        background-color: #c0392b;
                    }

                    .order-summary-total {
                        font-size: 1.8em;
                        font-weight: 700;
                        text-align: right;
                        margin-top: 15px;
                        color: #2c3e50;
                    }

                    .checkout-order-button {
                        background-color: #2ecc71;
                        color: white;
                        padding: 12px 20px;
                        border: none;
                        border-radius: 5px;
                        width: 100%;
                        cursor: pointer;
                        font-size: 1.1em;
                        font-weight: 600;
                        margin-top: 20px;
                        transition: background-color 0.3s ease;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                    }

                    .checkout-order-button:hover {
                        background-color: #27ae60;
                    }

                    /* --- Table Overview --- */
                    .tables-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 20px;
                    }

                    .table-card {
                        background-color: #fcfcfc;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        padding: 15px;
                        text-align: center;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
                        cursor: pointer;
                        transition: background-color 0.3s ease, border-color 0.3s ease, transform 0.2s ease;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between; /* Para empujar el botón de renombrar hacia abajo */
                    }

                    .table-card:hover {
                        transform: translateY(-3px);
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    }

                    .table-card.free {
                        border-color: #2ecc71; /* Verde para libre */
                        background-color: #e6ffe6; /* Fondo muy verde claro */
                    }

                    .table-card.pendiente-pago {
                        border-color: #9b59b6; /* Morado para pendiente de pago */
                        background-color: #f3e8ff; /* Fondo muy morado claro */
                    }

                    .table-card.selected {
                        border: 3px solid #3498db;
                        background-color: #d6eaf8; /* Azul claro si está seleccionada */
                    }

                    .table-card h3 {
                        margin-top: 0;
                        font-size: 1.3em;
                        font-weight: 600;
                        color: #2c3e50;
                    }

                    .table-card p {
                        margin: 5px 0 0;
                        font-size: 0.9em;
                        color: #555;
                    }

                    .table-card.free h3 { color: #2ecc71; }
                    .table-card.pendiente-pago h3 { color: #9b59b6; }

                    .status-indicator {
                        display: inline-block;
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        margin-left: 5px;
                    }

                    .status-indicator.free { background-color: #2ecc71; }
                    .status-indicator.pendiente-pago { background-color: #9b59b6; }

                    .order-total-display {
                        font-weight: 700;
                        color: #2c3e50;
                        margin-top: 10px;
                        font-size: 1.1em;
                    }

                    .complete-payment-button { /* Clase existente, ahora para el botón "Facturar" */
                        background-color: #2ecc71; /* Verde para facturar */
                        color: white;
                        border: none;
                        padding: 8px 15px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: 600;
                        margin-top: 10px;
                        transition: background-color 0.3s ease;
                    }
                    .complete-payment-button:hover {
                        background-color: #27ae60;
                    }

                    .table-actions-container {
                        display: flex;
                        gap: 15px;
                        margin-bottom: 25px;
                        justify-content: flex-end; /* Alinea los botones a la derecha */
                    }

                    .table-actions-container .primary-button {
                        background-color: #3498db;
                    }
                    .table-actions-container .primary-button:hover {
                        background-color: #2980b9;
                    }
                    .table-actions-container .delete-button {
                         background-color: #e74c3c;
                    }
                    .table-actions-container .delete-button:hover {
                        background-color: #c0392b;
                    }

                    /* Remove rename button from card */
                    .table-card .rename-button {
                        display: none;
                    }

                    /* --- New button for adding order to tables --- */
                    .add-order-button {
                        background-color: #3498db;
                        color: white;
                        border: none;
                        padding: 8px 15px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-weight: 500;
                        margin-top: 10px;
                        transition: background-color 0.3s ease;
                        width: 100%; /* Ocupar todo el ancho disponible */
                    }
                    .add-order-button:hover {
                        background-color: #2980b9;
                    }


                    /* --- Styles for the authentication choice --- */
                    .auth-choice-container, .admin-login-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: calc(100vh - 100px);
                        text-align: center;
                        background-color: #fff;
                        border-radius: 8px;
                        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
                        padding: 30px;
                        max-width: 450px;
                        margin: 50px auto;
                    }

                    .auth-choice-container h2, .admin-login-container h2 {
                        color: #2c3e50;
                        margin-bottom: 20px;
                        font-size: 2em;
                    }

                    .auth-choice-container p {
                        font-size: 1.1em;
                        color: #555;
                        margin-bottom: 25px;
                    }

                    .auth-choice-container .primary-button, .auth-choice-container .secondary-button,
                    .admin-login-container .primary-button, .admin-login-container .secondary-button {
                        width: 80%;
                        margin-bottom: 15px;
                        padding: 12px 20px;
                        font-size: 1.1em;
                        border-radius: 25px;
                    }
                    .admin-login-container .form-group {
                        width: 80%;
                    }

                    /* --- Modal base styles --- */
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background-color: rgba(0, 0, 0, 0.7);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                    }

                    .modal-content {
                        background-color: #fff;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
                        max-width: 400px;
                        width: 90%;
                        text-align: center;
                    }

                    .modal-content h3 {
                        margin-top: 0;
                        color: #2c3e50;
                        font-size: 1.8em;
                        margin-bottom: 20px;
                    }

                    .modal-content .form-group {
                        margin-bottom: 20px;
                    }

                    .modal-content .form-input {
                        width: calc(100% - 20px);
                    }

                    .modal-buttons {
                        display: flex;
                        justify-content: center;
                        gap: 15px;
                    }

                    /* --- Payment Details Modal Specific Styles --- */
                    .payment-details-modal {
                        max-width: 500px;
                        width: 95%;
                        text-align: left;
                    }
                    .order-details-summary h4 {
                        font-size: 1.2em;
                        margin-bottom: 10px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 5px;
                    }
                    .order-summary-items-list {
                        list-style: none;
                        padding: 0;
                        margin-bottom: 15px;
                        max-height: 150px; /* Limitar altura para scroll */
                        overflow-y: auto;
                    }
                    .order-summary-items-list li {
                        display: flex;
                        justify-content: space-between;
                        padding: 5px 0;
                        border-bottom: 1px dashed #f0f2f5;
                        font-size: 0.9em;
                        color: #555;
                    }
                    .summary-line {
                        display: flex;
                        justify-content: space-between;
                        padding: 5px 0;
                        font-size: 1em;
                        font-weight: 500;
                        color: #333;
                    }
                    .summary-line.tip-line {
                        color: #f39c12; /* Naranja para propina */
                    }
                    .summary-line.total-line {
                        font-size: 1.3em;
                        font-weight: 700;
                        border-top: 1px solid #ccc;
                        padding-top: 10px;
                        margin-top: 10px;
                    }
                    .payment-buttons {
                        display: flex;
                        flex-wrap: wrap; /* Para responsividad */
                        justify-content: center;
                        gap: 10px;
                        margin-top: 20px;
                    }
                    .payment-buttons .primary-button, .payment-buttons .secondary-button {
                        flex-grow: 1;
                        max-width: 100%; /* Asegurar que no se estiren demasiado */
                    }
                    @media (min-width: 768px) {
                        .payment-buttons .primary-button, .payment-buttons .secondary-button {
                            max-width: calc(50% - 5px); /* Dos botones por fila en pantallas más grandes */
                        }
                    }

                    /* --- Ticket Print Preview Styles --- */
                    .ticket-print-preview {
                        background-color: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                        width: 302px; /* Ancho explícito para 80mm (~302px) */
                        box-sizing: border-box; /* Incluir padding en el ancho */
                        margin: 20px auto;
                        color: #333;
                        font-family: 'monospace', 'Inter', sans-serif; /* Fuente de ticket */
                        font-size: 12px; /* Base font size for ticket */
                        text-align: center; /* Centrar todo el contenido del ticket */
                    }
                    .company-logo {
                        max-width: 100px;
                        height: auto;
                    }
                    .ticket-items-list {
                        list-style: none;
                        padding: 0;
                        margin-bottom: 10px;
                        border-top: 1px dashed #ccc;
                        padding-top: 10px;
                    }
                    .ticket-items-list li {
                        display: flex;
                        justify-content: space-between;
                        font-size: 0.85em;
                        margin-bottom: 5px;
                    }
                    .ticket-summary {
                        border-top: 1px dashed #ccc;
                        padding-top: 10px;
                        margin-top: 10px;
                    }
                    .ticket-summary .total-line {
                        font-size: 1.1em;
                    }

                    /* Hide elements for printing */
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .printable-area, .printable-area * {
                            visibility: visible;
                        }
                        .printable-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%; /* Ocupa todo el ancho de la página de impresión */
                            max-width: none; /* No restringir el ancho en la impresión */
                            margin: 0;
                            padding: 0;
                            box-shadow: none;
                        }
                        .hide-on-print {
                            display: none !important;
                        }
                    }
                    /* Rename management modal styles */
                    .rename-management-modal {
                        max-width: 500px;
                        text-align: left;
                    }
                    .table-rename-list {
                        list-style: none;
                        padding: 0;
                        max-height: 300px;
                        overflow-y: auto;
                    }
                    .table-rename-list li:last-child {
                        border-bottom: none;
                    }
                    .table-rename-list .form-input {
                        width: auto;
                    }

                    /* Additional styles for payment modal options */
                    .payment-method-section {
                        margin-top: 20px;
                        padding-top: 15px;
                        border-top: 1px solid #eee;
                    }

                    .payment-method-title {
                        font-size: 1.3em;
                        color: #2c3e50;
                        margin-bottom: 15px;
                    }

                    /* --- Footer --- */
                    footer {
                        background-color: #2c3e50;
                        color: white;
                        text-align: center;
                        padding: 15px 0;
                        margin-top: auto;
                        box-shadow: 0 -4px 8px rgba(0, 0, 0, 0.1);
                        font-size: 0.9em;
                    }

                    /* --- Responsividad --- */
                    @media (max-width: 768px) {
                        .header-content {
                            flex-direction: column;
                            gap: 10px;
                        }
                        .nav-menu {
                            flex-wrap: wrap;
                            justify-content: center;
                            gap: 10px;
                        }
                        .header-title {
                            font-size: 1.8em;
                        }
                        .user-info {
                            margin-top: 10px;
                            padding: 5px 8px; /* Ajuste para pantallas pequeñas */
                            font-size: 0.7em;
                        }
                        .edit-profile-button {
                             padding: 4px 8px;
                             font-size: 0.7em;
                        }
                        .logout-button {
                            padding: 6px 10px;
                            font-size: 0.9em;
                            min-width: 100px;
                        }

                        .app-layout, .order-reception-layout {
                            flex-direction: column;
                        }

                        .products-section, .order-section, .product-selection-panel, .order-summary-panel {
                            min-width: unset;
                            width: 100%;
                        }

                        .order-section, .order-summary-panel {
                            position: static;
                            top: unset;
                            align-self: unset;
                        }

                        .product-list, .order-product-list, .product-grid, .tables-grid {
                            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                        }
                    }

                    @media (max-width: 480px) {
                        .container {
                            margin: 10px auto;
                            padding: 0 10px;
                        }
                        .page-title {
                            font-size: 1.6em;
                        }
                        .dashboard-grid, .product-list, .order-product-list, .product-grid, .tables-grid {
                            grid-template-columns: 1fr; /* Una columna en pantallas muy pequeñas */
                        }
                        .dashboard-card, .product-item, .order-product-card, .table-card {
                            padding: 15px;
                        }
                        .auth-choice-container .primary-button, .auth-choice-container .secondary-button,
                        .admin-login-container .primary-button, .admin-login-container .secondary-button {
                            width: 95%;
                        }
                        .admin-login-container .form-group {
                            width: 95%;
                        }
                    }
                `}
            </style>
            {/* Cabecera de la aplicación */}
            <header className="header">
                <div className="header-content">
                    <h1 className="header-title">DarkPedidos</h1>
                    <nav className="nav-menu">
                        <button className={`nav-button ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>Dashboard</button>
                        {/* REMOVED: Botón de Pedidos */}
                        <button className={`nav-button ${currentPage === 'tableOverview' ? 'active' : ''}`} onClick={() => setCurrentPage('tableOverview')}>Mesas</button>
                        <button className={`nav-button ${currentPage === 'productManagement' ? 'active' : ''}`} onClick={() => setCurrentPage('productManagement')}>Productos</button>
                        <button className={`nav-button ${currentPage === 'reportes' ? 'active' : ''}`} onClick={() => setCurrentPage('reportes')}>Informes</button>
                        <button className={`nav-button ${currentPage === 'configuraciones' ? 'active' : ''}`} onClick={() => setCurrentPage('configuraciones')}
                            >
                            <FaCog style={{ marginRight: 5 }} />
                            </button>
                            

                        {user && (
                            <div className="user-info">
                                <span>Usuario:</span>
                                <span>{displayName}</span> {/* Mostrar el nombre configurable */}
                                <span>Rol:</span>
                                <span>{role}</span>
                                {role === 'admin' && ( // Botón para editar perfil, solo para admins
                                    <button className="edit-profile-button" onClick={() => {
                                        setNewDisplayName(displayName); // Cargar nombre actual en el input
                                        setShowProfileEditModal(true);
                                    }}>
                                        Editar Perfil
                                    </button>
                                )}
                            </div>
                        )}
                        {user && (
                            <button className="logout-button" onClick={handleLogout}>
                                Cerrar Sesión
                            </button>
                        )}
                    </nav>
                </div>
            </header>

            {/* Contenido principal */}
            <main className="container">
                {renderPage()}
            </main>

            {/* Modal para detalles de pago y ticket */}
            {showPaymentDetailsModal && (
                <MemoizedPaymentDetailsModal
                    currentTableForPayment={currentTableForPayment}
                    isGeneratingTicket={isGeneratingTicket}
                    setIsGeneratingTicket={setIsGeneratingTicket}
                    displayName={displayName}
                    companySettings={companySettings}
                    handleConfirmPaymentAndFreeTable={handleConfirmPaymentAndFreeTable}
                    setShowPaymentDetailsModal={setShowPaymentDetailsModal}
                />
            )}

            {/* Modal para gestión de renombrado de mesas */}
            {showRenameTableManagementModal && <RenameTableManagementModal />}

            {/* Modal para editar el nombre de usuario */}
            {showProfileEditModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Editar Nombre de Usuario</h3>
                        <div className="form-group">
                            <label htmlFor="newDisplayName" className="form-label">Nuevo Nombre</label>
                            <input
                                id="newDisplayName"
                                type="text"
                                className="form-input"
                                value={newDisplayName}
                                onChange={(e) => setNewDisplayName(e.target.value)}
                                placeholder="Introduce tu nuevo nombre"
                            />
                        </div>
                        <div className="modal-buttons">
                            <button className="primary-button" onClick={handleUpdateDisplayName}>Guardar</button>
                            <button className="secondary-button" onClick={() => setShowProfileEditModal(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}


            {/* Pie de página */}
            <footer>
                <p>&copy; 2023 DarkPedidos POS. Todos los derechos reservados.</p>
            </footer>
        </div>
    );
};

export default App;
const handleProcessPayment = async () => {
    try {
        // Asegúrate de que la base de datos esté disponible antes de continuar
        if (!dbInstance) {
            alert("Error: La conexión a la base de datos no está disponible. Intente recargar la página.");
            return;
        }

        // 1. Prepara los datos del pedido que vas a guardar
        const orderItems = currentTableForPayment.order
            .filter(item => item && item.product)
            .map(item => ({
                name: item.product.name,
                price: item.product.price,
                quantity: item.quantity,
            }));

        const totalCost = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

        const ventaData = {
            orderItems: orderItems,
            total: totalCost,
            tableId: currentTableForPayment.id,
            timestamp: serverTimestamp(),
        };

        // 2. Guarda la venta en una nueva colección llamada "ventas" en Firebase
        const docRef = await addDoc(collection(dbInstance, "ventas"), ventaData);
        console.log("Venta registrada con ID:", docRef.id);

        // 3. Actualiza el estado de la mesa a "pagado" y borra el pedido
        const mesaRef = doc(dbInstance, "mesas", currentTableForPayment.id);
        await updateDoc(mesaRef, { status: "pagado", order: [] });

        // 4. Muestra un mensaje de éxito y cierra el modal
        alert("Pago procesado con éxito.");
        setShowPaymentModal(false);

    } catch (error) {
        console.error("Error al procesar el pago y registrar la venta:", error);
        alert("Ocurrió un error al procesar el pago. Revisa la consola para más detalles.");
    }
};