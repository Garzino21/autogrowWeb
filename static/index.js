//gestire tutto il lato dell'irrigazione
//opzionale gestire una ventola che faccia circolare l'aria
//da arduino metto che appena acceso manda un dato e poi aspetta 10 minuti e manda un altro dato
//usare millis invece che delay
//mettere a posto bug del meteo che a volte mette undefined

//icone https://icons8.it/icon/set/meteo/fluency
//https://uiverse.io/

$(document).ready(function () {
    let stile = { "font-size": "15pt", "color": "black", "font-weight": "bold", "width": "100%" }
    //variabili
    let _paginaIniziale = $("#paginaIniziale");
    let _paginaDati = $("#paginaDati");
    let _progetto = $("#progetto");
    let _body = $("body");
    let _indietro = $("#indietro");
    let _rilevamenti = $("#rilevamenti");
    let _modalitaIrrigazione = $("#btnModalita");
    let _tabAutomatico = $("#tabAutomatico");
    let _btnStato = $("#btnStato");
    let modIrr = "";
    let _selectStorico = $("#selectStorico");
    let myChartix;
    let _navBar = $(".navb");
    let _monitora = $(".monitora");
    let _prog = $(".prog");
    let _home = $(".home");
    let _meteo = $("#meteo");
    let _tbody = $("#tbody");
    let _thead = $("#thead");
    let _domanda = $(".domanda");
    let _selectVisualData = $("#selectVisualData");
    let _tbodyAutomatico = $("#tbodyAutomatico");
    let _chatBtn = $("#chatBtn");

    const ctx = $("#myChart");

    async function provoGPT(domanda, listaMex) {
        console.log(domanda);
        let rq = inviaRichiesta("POST", "/api/domanda", { "domanda": domanda })
        rq.then(function (response) {
            console.log(response);
            let ul = $("<ul>").appendTo(listaMex).css({ "overflow": "hidden", "style-type": "none" });
            $("<li>").text(response.data.choices[0].message.content).addClass("risposta").css("style-type", "none").appendTo(ul);
        })
        rq.catch(function (err) {
            if (err.response.status == 401) {
                _lblErrore.show();
            }
            else
                errore(err);
        })
    }

    //RIQUADRO ORARIO
    setInterval(function () {
        let spann = $("<span>").text("").appendTo(_rilevamenti.children().eq(3)).css(stile)
        let hours = new Date().getHours();
        let minutes = new Date().getMinutes();
        let seconds = new Date().getSeconds();
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        if (minutes < 10) {
            minutes = "0" + minutes;
        }

        let oraAttuale = hours + ":" + minutes + ":" + seconds;
        _rilevamenti.children().eq(3).text(oraAttuale);
        spann = $("<span>").text("ORA ATTUALE").appendTo(_rilevamenti.children().eq(3)).css(stile)
    }, 1000);

    //impostazioni di avvio
    _paginaDati.show();
    _progetto.hide();
    _btnStato.hide();

    //presa dei dati
    prendiIrrigazioneAutomatica();

    //gestione eventi
    _chatBtn.on("click", function () {
        let html = `  <div class="card">
        <div class="chat-header">Chat</div>
          <div class="chat-window">
            <ul class="message-list"></ul>
          </div>
          <div class="chat-input">
              <input type="text" class="message-input" placeholder="Type your message here">
              <button id="btnDomanda" class="send-button">Send</button>
          </div>
        </div>`;

        Swal.fire({
            html: html,
            customClass: "swalGPT",
            background: "rgb(231, 255, 186)",
            width: "50%",
            heightAuto: "false",
            confirmButtonText: "OK",
        });
    });

    $(document).on('click', "#btnDomanda", function () {
        let domanda = $(".message-input");
        let listaMex = $(".message-list");
        let domandona = domanda.val();
        let ul = $("<ul>").appendTo(listaMex).css({ "overflow": "hidden", "style-type": "none" });
        $("<li>").text(domanda.val()).addClass("user").css("style-type", "none").appendTo(ul);
        domanda.val("");
        provoGPT(domandona, listaMex);
    });

    _meteo.on("click", function () {
        funzMeteo(_meteo.val());
    });

    $("#liMeteo").children().eq(1).on("click", function () {
        $(this).addClass("active");
        _monitora.removeClass("active");
        _prog.removeClass("active");
        _home.removeClass("active");
        funzMeteo(_meteo.val());
    });

    function funzMeteo(valore) {
        let dataDaCercare = valore;
        dataDaCercare = dataDaCercare.split("/");
        dataDaCercare = dataDaCercare[2] + "-" + dataDaCercare[1] + "-" + dataDaCercare[0];
        richiestaDatigiorno(dataDaCercare);
    }


    //gestione della select visualizzazione dati
    _selectVisualData.on("change", function () {
        gestioneSelect();
    });
    //gestione dei click sulle domande vicino ai titoli
    _domanda.children().on("click", function () {
        let testo = "";
        console.log($(this).prop("name"));

        if ($(this).prop("name") == "grafico") {
            testo = "il grafico della giornata odierna viene aggiornato ogni 5 minuti, puoi vedere la temperatura e l'umidità dell'aria, per vedere le giornate vecchie seleziona la data dal menù a tendina sottostante, per cambiare la visualizzazione dei dati clicca sull'opzione vusualizzazione dati all'ora";
        }
        else if ($(this).prop("name") == "irrigazione") {
            testo = "Clicca su MANUALE per impostare l'irrigazione manuale, clicca su AUTOMATICO per impostare l'irrigazione automatica e inizia a settare i parametri di irrigazione necessari";
        }
        else if ($(this).prop("name") == "meteo") {
            testo = "Ecco il meteo settimanale, Clicca su un'icona per vedere il meteo della giornata selezionata";
        }

        Swal.fire({
            icon: "question",
            html: `<div class='indent'>${testo}</div>`,
            background: "rgb(231, 255, 186)",
            width: "55%",
            heightAuto: "false",
            confirmButtonText: "OK",
        });
    })

    //btnMonitora
    _monitora.on("click", function () {
        _progetto.hide();
        _paginaDati.show();
        _body.css("overflow-y", "scroll");
        _navBar.show();
        $("#liMeteo").children().eq(1).removeClass("active");
        _monitora.addClass("active");
        _prog.removeClass("active");
        _home.removeClass("active");
    });

    //btnProgetto
    _prog.on("click", function () {
        _progetto.show();
        _paginaDati.hide();
        _indietro.show();
        _body.css("overflow", "scroll");
        _prog.addClass("active");
        _monitora.removeClass("active");
        _home.removeClass("active");
        $("#liMeteo").children().eq(1).removeClass("active");
    });

    //modAutomatico e manuale
    _modalitaIrrigazione.on("click", function () {
        if (_modalitaIrrigazione.text() == "MANUALE") {
            _modalitaIrrigazione.text("Caricamento...");
            if (window.innerWidth < 991) {
                _modalitaIrrigazione.css({ "margin-bottom": "20px", "float": "unset" })
            }
            aggiornoDb("AUTOMATICO");


        }
        else {
            _modalitaIrrigazione.text("Caricamento...");
            aggiornoDb("MANUALE");
        }
    });

    //btnStato acceso spento irriga in manuale
    _btnStato.on("click", function () {
        if (_btnStato.text() == "ACCENDI") {
            _btnStato.text("SPEGNI").css({ "background-color": "red", "border-color": "red" });
            Swal.fire({
                icon: "success",
                html: `<div class='indent'>HAI ACCESO L'IRRIGAZIONE</div>`,
                background: "rgb(231, 255, 186)",
                width: "55%",
                heightAuto: "false",
                confirmButtonText: "OK",
            });
        }
        else {
            _btnStato.text("ACCENDI").css({ "background-color": "green", "border-color": "green" });;
            Swal.fire({
                icon: "success",
                html: `<div class='indent'>HAI SPENTO L'IRRIGAZIONE</div>`,
                background: "rgb(231, 255, 186)",
                width: "55%",
                heightAuto: "false",
                confirmButtonText: "OK",
            });
        }
    });

    //prendo dati vecchi
    _selectStorico.on("change", function () {
        gestioneSelect();
    })

    function gestioneSelect() {
        myChartix.destroy();
        if (_selectStorico.val() == new Date().toLocaleDateString()) {
            let rq = inviaRichiesta("POST", "/api/prendidati")
            rq.then(function (response) {
                if (_selectVisualData.val() != 10)
                    prendiVisualDataOggi(_selectVisualData.val(), response)             //-----------------------------------------------------------------------------------------
                else
                    creaChart(response);
            })
            rq.catch(function (err) {
                if (err.response.status == 401) {
                    _lblErrore.show();
                }
                else
                    errore(err);
            })
        }
        else {

            let rq = inviaRichiesta("POST", "/api/prendiStorico")
            rq.then(function (response) {
                if (_selectVisualData.val() != 10)
                    prendiVisualDataStorico(_selectVisualData.val(), response)
                else
                    creaChart(response);
            })
            rq.catch(function (err) {
                if (err.response.status == 401) {
                    _lblErrore.show();
                }
                else
                    errore(err);
            })
        }
    }


    async function prendiIrrigazioneAutomatica() {
        let rq = inviaRichiesta("POST", "/api/prendiIrrigazioneAutomatica")
        rq.then(async function (response) {
            console.log(response.data);
            await generaTabellaAutomatica(response.data);
        })
        rq.catch(function (err) {
            if (err.response.status == 401) {
                _lblErrore.show();
            }
            else
                errore(err);
        })
    }

    let buttons = [];

    function generaTabellaAutomatica(response) {
        let i = 0;
        _tbodyAutomatico.empty();
        for (let item of response.disponibili) {
            let tr = $("<tr>").appendTo(_tbodyAutomatico);
            $("<td>").text(item.hum).appendTo(tr);
            $("<td>").text(item.timer).appendTo(tr);

            let td = $("<td>").appendTo(tr);
            let btn = $("<button>").appendTo(td).prop("value", i).on("click", function () {
                if (btn.text() == "ATTIVO") {
                    btn.text("Caricando...");
                    btn.prop("disabled", true);
                    aggiornaAutomatico(false, item.hum, item.timer, $(this).prop("value"));
                }
                else {
                    btn.text("Caricando...");
                    btn.prop("disabled", true);
                    aggiornaAutomatico(true, item.hum, item.timer, $(this).prop("value"));
                }
            }).addClass("button").css({ "width": "fit-content", "margin": "auto", "height": "fit-content", "font-size": "14pt", "margin-top": "10px", "margin-bottom": "10px" });

            if (item.selected == false) {
                btn.prop("disabled", false);
                btn.text("DISATTIVO");
            }
            else {
                btn.prop("disabled", false);
                btn.text("ATTIVO");
            }
            i++;
        }
    }

    async function aggiornaAutomatico(selected, hum, timer, posizione) {
        let rq = inviaRichiesta("POST", "/api/aggiornaIrrigazioneAutomatica", { "hum": hum, "timer": timer, "selected": selected, "posizione": posizione })
        rq.then(async function (response) {
            console.log(response.data);
            await prendiIrrigazioneAutomatica();
        })
        rq.catch(function (err) {
            if (err.response.status == 401) {
                _lblErrore.show();
            }
            else
                errore(err);
        })
    }

    function prendiVisualDataOggi(visualData, response) {

        let data = [];
        let valoreTemperatura = [];
        let umiditaAria = [];

        for (let item of response.data) {
            if (item.tipo == "temperatura") {
                //prendo i dati della temperatura e della data che userò anche per la data dell'umidità
                for (let valore of item.valori) {
                    valoreTemperatura.push(valore.dato);
                    data.push(valore.ora);
                }
            }
            else if (item.tipo == "umiditaAria") {
                //prendo i dati dell'umidità senza data tanto è all'incirca uguale alla temperatura
                for (let valore of item.valori) {
                    umiditaAria.push(valore.dato);
                }
            }
        }

        let coeffTaglio = (visualData / 10);

        data = data.filter((item, index) => index % coeffTaglio == 0);
        valoreTemperatura = valoreTemperatura.filter((item, index) => index % coeffTaglio == 0);
        umiditaAria = umiditaAria.filter((item, index) => index % coeffTaglio == 0);
        console.log("gaga" + data, valoreTemperatura, umiditaAria);
        visualGrafica(data, valoreTemperatura, umiditaAria);
    }

    function prendiVisualDataStorico(visualData, response) {

        let data = [];
        let valoreTemperatura = [];
        let umiditaAria = [];

        for (let item of response.data) {
            if (item.tipo == "temperatura") {
                //prendo i dati della temperatura e della data che userò anche per la data dell'umidità
                for (let valore of item.valori) {
                    valoreTemperatura.push(valore.dato);
                    data.push(valore.ora);
                }
            }
            else if (item.tipo == "umiditaAria") {
                //prendo i dati dell'umidità senza data tanto è all'incirca uguale alla temperatura
                for (let valore of item.valori) {
                    umiditaAria.push(valore.dato);
                }
            }
        }

        let coeffTaglio = visualData / 10;

        data = data.filter((item, index) => index % coeffTaglio == 0);
        valoreTemperatura = valoreTemperatura.filter((item, index) => index % coeffTaglio == 0);
        umiditaAria = umiditaAria.filter((item, index) => index % coeffTaglio == 0);

        visualGrafica(data, valoreTemperatura, umiditaAria);
    }



    //prendo dati dal db
    //prendo il meteo
    meteoOggi();
    meteoSettimana();


    //prendo le date dello storico per vedere se posso usare la select o no
    let dateStorico = [];
    rq = inviaRichiesta("POST", "/api/prendiStorico")
    rq.then(function (response) {
        console.log(response);
        let vediDataUguale;
        for (let item of response.data) {
            if (vediDataUguale != item.data) {
                dateStorico.push(item.data);
                vediDataUguale = item.data;
            }
        }
        if (dateStorico.length == 0) {
            _selectStorico.hide();
        }
        else {
            $("<option>").text("---Dati di oggi---").val(new Date().toLocaleDateString()).appendTo(_selectStorico);
            for (let item of dateStorico) {
                if (item == new Date().toLocaleDateString() - 1) {
                    $("<option>").text("Dati di ieri").val(item).appendTo(_selectStorico);
                }
                else {
                    $("<option>").text("Dati del " + item).val(item).appendTo(_selectStorico);
                }
            }
        }
    })
    rq.catch(function (err) {
        if (err.response.status == 401) {
            _lblErrore.show();
        }
        else
            errore(err);
    })



    //prendo dati per il grafico
    let tipo = "temperatura";
    rq = inviaRichiesta("POST", "/api/prendidati")
    rq.then(function (response) {
        //controlloData(response);
        creaChart(response);
        riempiCampi(response);
    })
    rq.catch(function (err) {
        if (err.response.status == 401) {
            _lblErrore.show();
        }
        else
            errore(err);
    })


    //prendo azioni
    rq = inviaRichiesta("POST", "/api/prendiazioni")
    rq.then(function (response) {
        //controlloData(response);
        riempioAzioni(response);
        console.log(response)
    })
    rq.catch(function (err) {
        if (err.response.status == 401) {
            _lblErrore.show();
        }
        else
            errore(err);
    })

    //cambio stato irrigazione in caso di successo
    function riempioAzioni(response) {
        for (let action of response.data) {
            if (action.tipo == "irrigazione") {
                modIrr = action.modalita;
                _modalitaIrrigazione.text(modIrr.toUpperCase());

                if (_modalitaIrrigazione.text() == "MANUALE") {
                    if (action.acceso == false) {
                        _btnStato.text("ACCENDI").css({ "background-color": "green", "border-color": "green" }).show();
                    }
                    else {
                        _btnStato.text("SPEGNI").css({ "background-color": "red", "border-color": "red" }).show();
                    }
                    _tabAutomatico.hide();

                }
                else {
                    _tabAutomatico.show();
                    _btnStato.hide();
                }
            }
        }
    }

    //aggiorno db da manuale a automatico e viceversa
    function aggiornoDb(modalita) {
        let rq = inviaRichiesta("POST", "/api/aggiornamodalita", { "modalita": modalita });
        rq.then(function (response) {
            console.log(response);
            if (modalita == "MANUALE") {
                _tabAutomatico.hide();
                _modalitaIrrigazione.text("MANUALE");
                _btnStato.show();
            }
            else {
                _modalitaIrrigazione.text("AUTOMATICO");
                _tabAutomatico.show();
                _btnStato.hide();
            }
        })
        rq.catch(function (err) {
            if (err.response.status == 401) {
                _lblErrore.show();
            }
            else
                errore(err);
        })
    }



    //riempio quadratini dei dati attuali
    function riempiCampi(response) {
        for (let item of response.data) {
            if (item.valori != null) {
                if (item.tipo == "temperatura") {
                    let valoreTemperatura = item.valori[item.valori.length - 1].dato;
                    console.log(valoreTemperatura);
                    _rilevamenti.children().eq(0).text(valoreTemperatura + "°C");
                    $("<span>").text("TEMPERATURA").appendTo(_rilevamenti.children().eq(0)).css(stile)
                }
                else if (item.tipo == "umiditaAria") {
                    let umiditaAria = item.valori[item.valori.length - 1].dato;
                    console.log(umiditaAria);
                    _rilevamenti.children().eq(1).text(umiditaAria + "%");
                    $("<span>").text("HUM ARIA").appendTo(_rilevamenti.children().eq(1)).css(stile)
                }
                /*else if (item.tipo == "umiditaTerra") {
                    let umiditaTerra = item.valori[item.valori.length - 1].dato;
                    console.log(umiditaTerra);
                    _rilevamenti.children().eq(2).text(umiditaTerra + "%");
                    $("<span>").text("HUM TERRA").appendTo(_rilevamenti.children().eq(2)).css(stile)
                }*/
            }
            else {
                for (let i = 0; i < 3; i++) {
                    _rilevamenti.children().eq(i).text("NaN");
                }
            }

        }
    }

    //creo il chart data la response
    function creaChart(response) {
        let data = [];
        let valoreTemperatura = [];
        let umiditaAria = [];

        for (let item of response.data) {
            if (item.tipo == "temperatura") {
                //prendo i dati della temperatura e della data che userò anche per la data dell'umidità
                for (let valore of item.valori) {
                    valoreTemperatura.push(valore.dato);
                    data.push(valore.ora);
                }
            }
            else if (item.tipo == "umiditaAria") {
                //prendo i dati dell'umidità senza data tanto è all'incirca uguale alla temperatura
                for (let valore of item.valori) {
                    umiditaAria.push(valore.dato);
                }
            }
        }

        visualGrafica(data, valoreTemperatura, umiditaAria);

    }


    function visualGrafica(data, valoreTemperatura, umiditaAria) {
        console.log(valoreTemperatura, data);

        //se i dati sono più di 12 li taglio
        if (valoreTemperatura.length > 12) {
            valoreTemperatura = valoreTemperatura.slice(valoreTemperatura.length - 12);
        }
        if (umiditaAria.length > 12) {
            umiditaAria = umiditaAria.slice(umiditaAria.length - 12);
        }
        if (data.length > 12) {
            data = data.slice(data.length - 12);
        }

        let config = {
            type: 'line',
            data: {
                labels: data,
                datasets: [{
                    label: 'Temperatura',
                    data: valoreTemperatura,
                    borderWidth: 1
                },
                {
                    label: 'Umidità',
                    data: umiditaAria,
                    borderWidth: 1
                }]
            },
            options: {

                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },

            }
        };
        myChartix = new Chart(ctx, config);

        //['5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '60']
    }
    //prendo dati per il meteo che ce nella nav in alto a destra
    function datiAttuali(response) {
        let time = [];
        let precipitazioni = [];
        let nuvole = [];
        let day = [];

        for (let i = 0; i < 23; i++) {
            time.push(response.data.hourly.time[i]);
            precipitazioni.push(response.data.hourly.precipitation[i]);
            nuvole.push(response.data.hourly.cloud_cover[i]);
            day.push(response.data.hourly.is_day[i]);
        }

        let oraAttuale = new Date().getHours();
        _meteo.val(new Date().toLocaleDateString());

        if (precipitazioni[oraAttuale] > 2) {
            if (neve[i] > 0 && neve[i] < 0.5) {
                _meteo.prop("src", "img/neveLeggera.png")
            }
            else if (neve[i] >= 0.5) {
                _meteo.prop("src", "img/neveForte.png")
            }
            else {
                _meteo.prop("src", "img/pioggiaForte.png");
            }

        }
        else if (precipitazioni[oraAttuale] >= 1 && precipitazioni[oraAttuale] <= 2) {
            if (neve[i] > 0 && neve[i] < 0.5) {
                _meteo.prop("src", "img/neveLeggera.png")
            }
            else if (neve[i] >= 0.5) {
                _meteo.prop("src", "img/neveForte.png")
            }
            else {
                _meteo.prop("src", "img/pioggiaLeggera.png");
            }
        }
        else if (precipitazioni[oraAttuale] >= 0 && precipitazioni[oraAttuale] < 1) {
            if (day[oraAttuale] == 1) {
                if (nuvole[oraAttuale] >= 40 && nuvole[oraAttuale] < 70) {
                    _meteo.prop("src", "img/mezzaNuvola.png");
                }
                else if (nuvole[oraAttuale] >= 70) {
                    _meteo.prop("src", "img/nuvola.png");
                }
                else {
                    _meteo.prop("src", "img/sole.png");
                }
            }
            else {
                if (nuvole[oraAttuale] >= 40 && nuvole[oraAttuale] < 70) {
                    _meteo.prop("src", "img/mezzaNotte.png");
                }
                else if (nuvole[oraAttuale] >= 70) {
                    _meteo.prop("src", "img/nuvola.png");
                }
                else {
                    _meteo.prop("src", "img/notte.png");
                }
            }
        }
    }

    //prendo dati settimanali per meteo settimanale
    function datiSettimana(response) {
        let day = [];
        let precipitazioni = [];
        let tMax = [];
        let tMin = [];
        let neve = [];

        for (let i = 0; i < 7; i++) {
            day.push(response.data.daily.time[i]);
            precipitazioni.push(response.data.daily.precipitation_sum[i]);
            tMax.push(response.data.daily.temperature_2m_max[i]);
            tMin.push(response.data.daily.temperature_2m_min[i]);
            neve.push(response.data.daily.snowfall_sum[i]);
        }

        let oggi = new Date().toLocaleDateString();


        for (let i = 0; i < 7; i++) {

            let td = $("<td>").appendTo(_tbody.children().eq(0)).val(day[i]).on("click", function () {
                richiestaDatigiorno($(this).val());
                console.log("giorno del valore " + $(this).val());
            });

            if (precipitazioni[i] > 15) {
                if (neve[i] > 0 && neve[i] < 5) {
                    $("<img>").prop("src", "img/neveLeggera.png").appendTo(td);
                }
                else if (neve[i] >= 5) {
                    $("<img>").prop("src", "img/neveForte.png").appendTo(td);
                }
                else {
                    $("<img>").prop("src", "img/pioggiaForte.png").appendTo(td);
                }
            }
            else if (precipitazioni[i] > 1 && precipitazioni[i] <= 15) {
                if (neve[i] > 0 && neve[i] < 5) {
                    $("<img>").prop("src", "img/neveLeggera.png").appendTo(td);
                }
                else if (neve[i] >= 5) {
                    $("<img>").prop("src", "img/neveForte.png").appendTo(td);
                }
                else {
                    $("<img>").prop("src", "img/pioggiaLeggera.png").appendTo(td);
                }
            }
            else if (precipitazioni[i] > 0 && precipitazioni[i] <= 1) {
                $("<img>").prop("src", "img/nuvola.png").appendTo(td);
            }
            else if (precipitazioni[i] == 0) {
                $("<img>").prop("src", "img/sole.png").appendTo(td);
            }

            td = $("<td>").text(tMin[i] + "° - ").appendTo(_tbody.children().eq(1)).css("color", "blue");
            $("<span>").text(tMax[i] + "°").appendTo(td).css("color", "red");

            //metto giorno della settimana

        }

        let dayName = new Date().toDateString();
        let giorniTotali = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        dayName = dayName.split(" ");
        dayName = dayName[0];
        let giorniOrdinati = [];

        for (let i = 0; i < 7; i++) {
            if (dayName == giorniTotali[i]) {
                giorniOrdinati.push(giorniTotali[i]);
                for (let j = i + 1; j < 7; j++) {
                    giorniOrdinati.push(giorniTotali[j]);
                }
                for (let j = 0; j < i; j++) {
                    giorniOrdinati.push(giorniTotali[j]);
                }
            }
        }

        for (let giorn of giorniOrdinati) {
            giorn = calcolaNomeGiorno(giorn);
            $("<td>").text(giorn).appendTo(_thead.children().eq(0));
        }
    }


    //calcolo nome del giorno
    function calcolaNomeGiorno(giorn) {
        switch (giorn) {
            case "Sun":
                giorn = "Domenica";
                break;
            case "Mon":
                giorn = "Lunedì";
                break;
            case "Tue":
                giorn = "Martedì";
                break;
            case "Wed":
                giorn = "Mercoledì";
                break;
            case "Thu":
                giorn = "Giovedì";
                break;
            case "Fri":
                giorn = "Venerdì";
                break;
            case "Sat":
                giorn = "Sabato";
                break;
        }
        return giorn;
    }

    //invio richiesta meteo settimana
    function meteoSettimana() {
        rq = inviaRichiesta("GET", "https://api.open-meteo.com/v1/forecast?latitude=44.6833200&longitude=7.2757100&daily=temperature_2m_max&daily=temperature_2m_min&daily=precipitation_sum&daily=snowfall_sum&timezone=Europe%2FBerlin")
        rq.then(function (response) {
            datiSettimana(response);
        })
        rq.catch(function (err) {
            if (err.response.status == 401) {
                _lblErrore.show();
            }
            else
                errore(err);
        })
    }

    //invio richiesta meteo oggi
    function meteoOggi() {
        let rq = inviaRichiesta("GET", "https://api.open-meteo.com/v1/forecast?latitude=44.6833200&longitude=7.2757100&hourly=cloud_cover&hourly=precipitation&hourly=is_day&hourly=snowfall&timezone=Europe%2FBerlin")
        rq.then(function (response) {
            datiAttuali(response);
        })
        rq.catch(function (err) {
            if (err.response.status == 401) {
                _lblErrore.show();
            }
            else
                errore(err);
        })
    }

    // invio richiesta meteo giorno scelto
    function richiestaDatigiorno(giorno) {
        let rq = inviaRichiesta("GET", "https://api.open-meteo.com/v1/forecast?latitude=44.6833200&longitude=7.2757100&hourly=cloud_cover&hourly=precipitation&hourly=temperature&hourly=snowfall&timezone=Europe%2FBerlin")
        rq.then(function (response) {
            RiempioSwal(response, giorno);
        })
        rq.catch(function (err) {
            if (err.response.status == 401) {
                _lblErrore.show();
            }
            else
                errore(err);
        })
    }

    //riempio la swal con i dati del meteo
    function RiempioSwal(response, giornoScelto) {
        let giornoOggi = new Date().toLocaleDateString();


        let dayName = new Date(giornoScelto).toDateString();
        dayName = dayName.split(" ");
        dayName = dayName[0];
        dayName = calcolaNomeGiorno(dayName);

        giornoOggi = giornoOggi.split("/");
        giornoOggi = giornoOggi[0];

        giornoScelto = giornoScelto.split("-");
        giornoScelto = giornoScelto[2];
        console.log("giorni " + giornoScelto, giornoOggi);            //problema se giorno scelto è minore di giorno oggi

        let num = capisciMese()
        console.log("num" + num);
        let oreDiff
        let delay
        if (giornoScelto < giornoOggi) {         //il problema penso sia il fatto che se sono a aprile devo prendere il
            delay = num - (giornoOggi - giornoScelto);
            oreDiff = (delay * 24) - (delay * 1);
        }
        else {
            delay = giornoScelto - giornoOggi;
            oreDiff = (delay * 24) - (delay * 1);
        }
        // let a= moment(giornoScelto).format("DD")
        // let b= moment(giornoOggi).format("DD")
        // a.diff(b, 'days')
        // console.log(a.diff(b, 'days'))

        console.log(oreDiff);

        let time = [];
        let precipitazioni = [];
        let nuvole = [];
        let temperatura = [];
        let neve = [];

        for (let i = oreDiff; i <= oreDiff + 24; i++) {
            time.push(response.data.hourly.time[i]);
            precipitazioni.push(response.data.hourly.precipitation[i]);
            nuvole.push(response.data.hourly.cloud_cover[i]);
            temperatura.push(response.data.hourly.temperature[i]);
            neve.push(response.data.hourly.snowfall[i]);
        }
        console.log(time, precipitazioni, nuvole);

        let imgs = "";
        let temp = "";
        let index = 0;
        for (let prec of precipitazioni) {
            if (index % 3 == 0 && index != 0) {
                if (prec >= 2) {
                    if (neve[index] > 0 && neve[index] < 0.5) {
                        imgs += "<td><img src='img/neveLeggera.png'></td>";
                    }
                    else if (neve[index] >= 0.5) {
                        imgs += "<td><img src='img/neveForte.png'></td>";
                    }
                    else {
                        imgs += "<td><img src='img/pioggiaForte.png'></td>";
                    }
                }
                else if (prec >= 0.5 && prec < 2) {
                    if (neve[index] > 0 && neve[index] < 0.5) {
                        imgs += "<td><img src='img/neveLeggera.png'></td>";
                    }
                    else if (neve[index] >= 0.5) {
                        imgs += "<td><img src='img/neveForte.png'></td>";
                    }
                    else {
                        imgs += "<td><img src='img/pioggiaLeggera.png'></td>";
                    }
                }
                else if (prec >= 0 && prec < 0.5) {
                    console.log("nuv" + nuvole[index], index);
                    if (neve[index] > 0 && neve[index] < 0.5) {
                        imgs += "<td><img src='img/neveLeggera.png'></td>";
                    }
                    else if (neve[index] >= 0.5) {
                        imgs += "<td><img src='img/neveForte.png'></td>";
                    }
                    else if (nuvole[index] >= 40 && nuvole[index] < 70) {
                        imgs += "<td><img src='img/mezzaNuvola.png'></td>";
                    }
                    else if (nuvole[index] >= 70) {
                        imgs += "<td><img src='img/nuvola.png'></td>";
                    }
                    else if (nuvole[index] < 40) {
                        imgs += "<td><img src='img/sole.png'></td>";
                    }
                }
                temp += `<td>${temperatura[index]}°C</td>`;
                console.log(imgs);
            }
            index++;
        }

        console.log(imgs);

        //imgs.push("<td><img src='img/pioggiaForte.png'></td>");

        let html = `<div class='indent'><table id='tabSwal'>
        <thead>
          <tr>
            <td>00-2</td>
            <td>3-5</td>
            <td>6-8</td>
            <td>9-11</td>
            <td>12-14</td>
            <td>15-17</td>
            <td>18-20</td>
            <td>21-23</td>
          </tr>
        </thead>
        <tbody>
          <tr>
          ${imgs}
          </tr>
          <tr>
          ${temp}
          </tr>
        </tbody>
      </table></div>`;

        Swal.fire({
            title: `<i>Meteo di ${dayName}</i>`,
            html: html,
            background: "rgb(231, 255, 186)",
            width: "80%",
            heightAuto: "false",
            confirmButtonText: "OK",
        });
    }

    //calcola mese
    function capisciMese() {
        let mese = new Date().toLocaleDateString();
        mese = mese.split("/");
        mese = mese[1];
        console.log("mese " + mese);

        let n
        switch (mese) {
            case "1":
                n = 31;
                break;
            case "2":
                n = 28;
                break;
            case "3":
                n = 31;
                break;
            case "4":
                n = 30;
                break;
            case "5":
                n = 31;
                break;
            case "6":
                n = 30;
                break;
            case "7":
                n = 31;
                break;
            case "8":
                n = 31;
                break;
            case "9":
                n = 30;
                break;
            case "10":
                n = 31;
                break;
            case "11":
                n = 30;
                break;
            case "12":
                n = 31;
                break;
        }
        return n;
    }

    //MEDIA QUERY
    if (_modalitaIrrigazione.text() == "AUTOMATICO") {
        if (window.innerWidth < 991) {
            _modalitaIrrigazione.css({ "margin-bottom": "20px", "float": "unset" })
        }
    }

    onresize = function () {
        if (_modalitaIrrigazione.text() == "AUTOMATICO") {
            if (window.innerWidth < 991) {
                _modalitaIrrigazione.css({ "margin-bottom": "20px", "float": "unset" })
            }
        }
    }



    /*function controlloData(response) {
        let dati = [];
        for (let item of response.data) {
            if(item.tipo=="temperatura")
            {
                if (item.valori[item.valori.length - 1].data != new Date().toLocaleDateString()) {    
                    let rq = inviaRichiesta("POST", "/api/aggiornaStorico", );
                    rq.then(function (response) {
                        console.log(response);
                    })
                    rq.catch(function (err) {
                        if (err.response.status == 401) {
                            _lblErrore.show();
                        }
                        else
                            errore(err);
                    })
                }
            }
        }
    }*/
});