import _http from "http";
import _url from "url";
import _fs from "fs";
import _express from "express";
import _dotenv from "dotenv";
import _cors from "cors";
import _fileUpload from "express-fileupload";
import _streamifier from "streamifier";

// Lettura delle password e parametri fondamentali
_dotenv.config({ "path": ".env" });


// Variabili relative a MongoDB ed Express
import { MongoClient, ObjectId } from "mongodb";
const DBNAME = process.env.DBNAME;
const connectionString: string = process.env.connectionStringAtlas;
const app = _express();

// Creazione ed avvio del server
// app è il router di Express, si occupa di tutta la gestione delle richieste http
const PORT: number = parseInt(process.env.PORT);
let paginaErrore;
const server = _http.createServer(app);
// Il secondo parametro facoltativo ipAddress consente di mettere il server in ascolto su una delle interfacce della macchina, se non lo metto viene messo in ascolto su tutte le interfacce (3 --> loopback e 2 di rete)
server.listen(PORT, () => {
    init();
    console.log(`Il Server è in ascolto sulla porta ${PORT}`);
});

function init() {
    _fs.readFile("./static/error.html", function (err, data) {
        if (err) {
            paginaErrore = `<h1>Risorsa non trovata</h1>`;
        }
        else {
            paginaErrore = data.toString();
        }
    });
}

//********************************************************************************************//
// Routes middleware
//********************************************************************************************//

// 1. Request log
app.use("/", (req: any, res: any, next: any) => {
    console.log(`-----> ${req.method}: ${req.originalUrl}`);
    next();
});

// 2. Gestione delle risorse statiche
// .static() è un metodo di express che ha già implementata la firma di sopra. Se trova il file fa la send() altrimenti fa la next()
app.use("/", _express.static("./static"));

// 3. Lettura dei parametri POST di req["body"] (bodyParser)
// .json() intercetta solo i parametri passati in json nel body della http request
app.use("/", _express.json({ "limit": "50mb" }));
// .urlencoded() intercetta solo i parametri passati in urlencoded nel body della http request
app.use("/", _express.urlencoded({ "limit": "50mb", "extended": true }));

// 4. Aggancio dei parametri del FormData e dei parametri scalari passati dentro il FormData
// Dimensione massima del file = 10 MB
app.use("/", _fileUpload({ "limits": { "fileSize": (10 * 1024 * 1024) } }));

// 5. Log dei parametri GET, POST, PUT, PATCH, DELETE
app.use("/", (req: any, res: any, next: any) => {
    if (Object.keys(req["query"]).length > 0) {
        console.log(`       ${JSON.stringify(req["query"])}`);
    }
    if (Object.keys(req["body"]).length > 0) {
        console.log(`       ${JSON.stringify(req["body"])}`);
    }
    next();
});

// 6. Controllo degli accessi tramite CORS
const corsOptions = {
    origin: function (origin, callback) {
        return callback(null, true);
    },
    credentials: true
};
app.use("/", _cors(corsOptions));

//********************************************************************************************//
// Routes finali di risposta al client
//********************************************************************************************//

app.post("/api/dati", async (req, res, next) => {
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DBNAME).collection("dati");
    let rq = collection.find({}).toArray();
    rq.then((data) => {
        if (!data) {
            res.status(401).send("Not found");
        }
        else {
            res.send(data);
        }
    });
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

//serve a aggiungere dati alla temperatura
app.get("/api/inviadati", async (req, res, next) => {
    //prendo data e ora all'invio del dato pk altrimenti dovrei avere un altro modulo su arduino
    let now = new Date();
    let ora;
    let date = now.toLocaleDateString();
    console.log(now.toLocaleDateString());
    if (now.getMinutes() < 10)
        if (now.getMinutes() == 0)
            ora = now.getHours() + ":" + now.getMinutes() + "0";
        else
            ora = now.getHours() + ":" + "0" + now.getMinutes();
    else
        ora = now.getHours() + ":" + now.getMinutes();

    //prendo il dato e il tipo
    let temp = req["query"].temp;
    let hum = req["query"].hum;
    console.log(temp);
    console.log(hum);

    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DBNAME).collection("dati");
    let rq = collection.find({}).toArray();
    rq.then(async (risposta) => {
        //let aggiungiT: boolean = false;
        //let aggiungiH: boolean = false;

        if(risposta[1].valori!="")
        {
            console.log("-------------------------------------------------------------------------------------");
            if (risposta[1].valori[(risposta[1].valori.length) - 1].data != date) {    //date data di oggi
                console.log("aggiorno storico");
                //await aggiornaStorico(risposta, date, res, req); 
                //await eliminareDatiVecchi(risposta, date, res, req);
            }

            await aggiungoTemperatura(temp, ora, res, date);
            await aggiungoUmidita(hum, ora, res, date);
            res.send("aggiunto");

            //#region Codice controllo se i dati sono uguali
            //NON FACCIO PIU IL CONTROLLO SE CAMBIANO I DATI PER POTER VISUALIZZARE AL MEGLIO I GRAFICI
            // for (let dato of risposta) {
            //     if (dato.tipo == "temperatura") {
            //         if (dato.valori[dato.valori.length - 1].dato == temp)
            //             aggiungiT = false;
            //         else
            //             aggiungiT = true;
    
            //     }
            //     else if (dato.tipo == "umiditaAria") {
            //         if (dato.valori[dato.valori.length - 1].dato == hum)
            //             aggiungiH = false;
            //         else
            //             aggiungiH = true;
            //     }
            // }
    
    
            // if (aggiungiT || aggiungiH) {
            //     await aggiungoTemperatura(temp, ora, res, date);
            //     await aggiungoUmidita(hum, ora, res, date);
            //     res.send("aggiunto");
            // }
            // else {
            //     console.log("dati uguali");
            //     res.send("dati uguali");
            // }
            //#endregion
        }
        else
        {
            await aggiungoTemperatura(temp, ora, res, date);
            await aggiungoUmidita(hum, ora, res, date);
            res.send("aggiunto");
        }
    });
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());

});

app.post("/api/prendidati", async (req, res, next) => {
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DBNAME).collection("dati");
    let rq = collection.find({}).toArray();
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.post("/api/prendiazioni", async (req, res, next) => {
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DBNAME).collection("azioni");
    let rq = collection.find({}).toArray();
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.post("/api/aggiornamodalita", async (req, res, next) => {
    let mod = req["body"].modalita;
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DBNAME).collection("azioni");
    let rq = collection.updateOne({ tipo: 'irrigazione' }, { $set: { 'modalita': mod } });
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});


app.post("/api/prendiStorico", async (req, res, next) => {
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DBNAME).collection("storico");
    let rq = collection.find({}).toArray();
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

app.post("/api/prendiAzioni", async (req, res, next) => {
    let tipo = req["body"].tipo;
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DBNAME).collection("dati");
    let rq = collection.find({}).toArray();
    rq.then((data) => res.send(data));
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    rq.finally(() => client.close());
});

async function aggiungoUmidita(hum: any, ora: any, res: any, date: any) {
    //mi collego al db
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DBNAME).collection("dati");

    //aggiungo il dato
    let rq = collection.updateOne({ tipo: 'umiditaAria' }, { $push: { 'valori': { "dato": hum, "ora": ora, "data": date } } });
    rq.then((data) => {
        console.log("aggiunta umidita");
    }
    );
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
}


async function aggiungoTemperatura(temp: any, ora: any, res: any, date: any) {
    //mi collego al db
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DBNAME).collection("dati");

    //aggiungo il dato
    let rq = collection.updateOne({ tipo: 'temperatura' }, { $push: { 'valori': { "dato": temp, "ora": ora, "data": date } } });
    rq.then((data) => {
        console.log("aggiunta temperatura");
    }
    );
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
}

async function eliminareDatiVecchi(data: import("mongodb").WithId<import("bson").Document>[], date: string, res: any, req: any) {
    for (let dato of data) {
        const client = new MongoClient(connectionString);
        await client.connect();
        let collection = client.db(DBNAME).collection("dati");
        let valori:never;
        //aggiungo il dato
        let rq = collection.updateMany({},{ $set: {valori: []} })
        rq.then(async (data) => {
            console.log("cancellato");
        });
        rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
    }
}

async function aggiornaStorico(data: import("mongodb").WithId<import("bson").Document>[], date: string, res: any, req: any) {
    return new Promise(async (resolve, reject) => {

        for (let dato of data) {
            let valoriVecchi = [];
            let aggiungi = {};
            let campo = {};
            let contatore = 0;
            for (let valore of dato.valori) {

                aggiungi = { "ora": valore.ora, "valore": valore.dato };
                valoriVecchi.push(aggiungi);
                campo = { "tipo": dato.tipo, "data": valore.data, "valori": valoriVecchi };
                contatore++;

                if (contatore == dato.valori.length) {
                    console.log(dato.tipo);
                    console.log(contatore);

                    await aggiungoDatiStorico(campo, res, req, dato.tipo);

                }
            }
        }
        resolve("aggiunto");
    });
}

async function aggiungoDatiStorico(campo: any, res: any, req: any, tipo: any) {
    const client = new MongoClient(connectionString);
    await client.connect();
    let collection = client.db(DBNAME).collection("storico");
    //aggiungo il dato
    let rq = collection.insertOne(campo);
    rq.then(async (data) => {
        console.log("aggiunta: " + tipo);
    });
    rq.catch((err) => res.status(500).send(`Errore esecuzione query: ${err}`));
}



//********************************************************************************************//
// Default route e gestione degli errori
//********************************************************************************************//

app.use("/", (req, res, next) => {
    res.status(404);
    if (req.originalUrl.startsWith("/api/")) {
        res.send(`Api non disponibile`);
    }
    else {
        res.send(paginaErrore);
    }
});

app.use("/", (err, req, res, next) => {
    console.log("************* SERVER ERROR ***************\n", err.stack);
    res.status(500).send(err.message);
});






