document.addEventListener('DOMContentLoaded', () => {
    const resultsSection = document.querySelector('.results-section');
    const resultsBody = document.getElementById('resultsBody');
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const uploadButton = document.getElementById('uploadButton');
    const uploadPopup = document.getElementById('uploadPopup');
    const closePopupButton = document.getElementById('closePopup');
    
    // Anfangs die Ergebnisbereiche ausblenden
    document.querySelector('.podium-card').style.display = 'none';
    document.querySelector('.left-column').style.display = 'none';
    document.querySelector('.right-column').style.display = 'none';
    
    // Upload-Button Funktionalität
    uploadButton.addEventListener('click', () => {
        uploadPopup.classList.add('show');
    });
    
    // Popup schließen
    closePopupButton.addEventListener('click', () => {
        uploadPopup.classList.remove('show');
    });
    
    // Popup schließen wenn außerhalb geklickt wird
    uploadPopup.addEventListener('click', (e) => {
        if (e.target === uploadPopup) {
            uploadPopup.classList.remove('show');
        }
    });
    
    // Drag & Drop Funktionalität
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('dragover');
    }
    
    function unhighlight() {
        dropArea.classList.remove('dragover');
    }
    
    // CSV-Datei verarbeiten, wenn sie fallen gelassen wird
    dropArea.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length) {
            handleFiles(files);
        }
    }
    
    // Datei-Input-Änderung behandeln
    fileInput.addEventListener('change', function() {
        if (this.files.length) {
            handleFiles(this.files);
        }
    });
    
    // Klick auf den Drag & Drop Bereich
    dropArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    function handleFiles(files) {
        const file = files[0]; // Nur die erste Datei nehmen
        
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const csvData = e.target.result;
                processCSVData(csvData);
                // Popup nach erfolgreicher Verarbeitung schließen
                uploadPopup.classList.remove('show');
            };
            
            reader.readAsText(file);
        } else {
            alert('Bitte nur CSV-Dateien hochladen.');
        }
    }
    
    function processCSVData(csvData) {
        try {
            console.log('Verarbeite CSV-Daten...');
            
            // Automatische Spaltenerkennung
            const data = parseCSV(csvData);
            
            if (!data || data.length === 0) {
                alert('Die CSV-Datei enthält keine Daten.');
                return;
            }
            
            // Automatische Spaltenerkennung
            const headers = Object.keys(data[0]);
            console.log('Verfügbare Headers:', headers);
            
            // Prüfe direkt auf die exakten Spalten 'Fehler' und 'min:sec'
            console.log('Enthält die Spalte "Fehler"?', headers.includes('Fehler'));
            console.log('Enthält die Spalte "min:sec"?', headers.includes('min:sec'));
            
            // Suche nach Zeit- und Fehlerspalten anhand der Spaltennamen
            let timeColumn = findTimeColumn(headers);
            let errorColumn = findErrorColumn(headers);
            
            console.log('Gefundene Spalten:', {Zeit: timeColumn, Fehler: errorColumn});
            
            // Wenn 'Fehler' ein exakter Header ist, aber nicht gefunden wurde, erzwinge die Verwendung
            if (headers.includes('Fehler') && errorColumn !== 'Fehler') {
                console.log('Erzwinge Verwendung der exakten Fehlerspalte "Fehler"');
                errorColumn = 'Fehler';
            }
            
            // Wenn 'min:sec' ein exakter Header ist, aber nicht gefunden wurde, erzwinge die Verwendung
            if (headers.includes('min:sec') && timeColumn !== 'min:sec') {
                console.log('Erzwinge Verwendung der exakten Zeitspalte "min:sec"');
                timeColumn = 'min:sec';
            }
            
            // Hart-kodierte Fallback-Positionen für das bekannte Format
            if (!timeColumn && headers.length >= 7) {
                timeColumn = headers[6]; // min:sec ist typischerweise an Position 7
                console.log('Verwende Fallback für Zeitspalte:', timeColumn);
            }
            
            if (!errorColumn && headers.length >= 5) {
                errorColumn = headers[4]; // Fehler ist typischerweise an Position 5
                console.log('Verwende Fallback für Fehlerspalte:', errorColumn);
            }
            
            if (!timeColumn || !errorColumn) {
                alert(`Die benötigten Spalten für Zeit und Fehler konnten nicht automatisch erkannt werden.
Verfügbare Spalten: ${headers.join(', ')}`);
                return;
            }
            
            // Debug: Zeige die ersten 5 Datensätze mit den erkannten Spalten
            console.log('Debug - Ersten 5 Datensätze:');
            data.slice(0, 5).forEach((entry, i) => {
                console.log(`Eintrag ${i+1}:`);
                console.log(`  Name: ${getParticipantName(entry)}`);
                console.log(`  Zeit (${timeColumn}): ${entry[timeColumn]}`);
                console.log(`  Fehler (${errorColumn}): ${entry[errorColumn]}`);
            });
            
            // Standard-Gewichtungen für die Berechnung
            const timeWeight = 1;
            const errorWeight = 10;  // Ein Fehler entspricht 10 Sekunden
            
            // Berechne Punktzahl und sortiere
            const results = calculateRanking(data, timeColumn, errorColumn, timeWeight, errorWeight);
            displayResults(results);
            
            // Ergebnisbereiche einblenden
            document.querySelector('.podium-card').style.display = 'block';
            document.querySelector('.left-column').style.display = 'flex';
            document.querySelector('.right-column').style.display = 'block';
            
        } catch (error) {
            alert(`Fehler beim Verarbeiten der CSV-Datei: ${error.message}`);
            console.error('Fehler beim Verarbeiten der CSV-Datei:', error);
        }
    }
    
    // Funktion zur automatischen Erkennung der Zeitspalte
    function findTimeColumn(headers) {
        const timeColumnKeywords = ['zeit', 'time', 'min:sec', 'min', 'sec', 'duration'];
        return findColumnByKeywords(headers, timeColumnKeywords);
    }
    
    // Funktion zur automatischen Erkennung der Fehlerspalte
    function findErrorColumn(headers) {
        // Direkte Abfrage der Fehler-Spalte, wenn sie exakt so heißt
        if (headers.includes('Fehler')) {
            console.log('Exakte Fehler-Spalte gefunden: Fehler');
            return 'Fehler';
        }
        
        const errorColumnKeywords = [
            'fehler', 
            'error', 
            'mistakes', 
            'penalty', 
            'falsch', 
            'incorrect', 
            'typo', 
            'mistake'
        ];
        
        console.log('Suche nach Fehlerspalte mit folgenden Keywords:', errorColumnKeywords);
        return findColumnByKeywords(headers, errorColumnKeywords);
    }
    
    // Funktion zum Finden einer Spalte anhand von Schlüsselwörtern
    function findColumnByKeywords(headers, keywords) {
        console.log('Suche nach Spalten mit Keywords:', keywords, 'in Headers:', headers);
        
        // Exakte Matches für spezielle Spalten
        if (keywords.includes('fehler')) {
            // Direkte Überprüfung auf "Fehler" (case-sensitive)
            const exactMatch = headers.find(h => h === 'Fehler');
            if (exactMatch) {
                console.log('Exakter Match für Fehler gefunden:', exactMatch);
                return exactMatch;
            }
        }
        
        if (keywords.includes('min:sec')) {
            // Direkte Suche nach exakten Matches für min:sec
            const exactMatch = headers.find(h => h === 'min:sec' || h === 'minsec');
            if (exactMatch) {
                console.log('Exakter Match für Zeit gefunden:', exactMatch);
                return exactMatch;
            }
        }
        
        // Case-insensitive Keyword-Suche
        for (const keyword of keywords) {
            for (let header of headers) {
                const headerLower = header.toLowerCase();
                const keywordLower = keyword.toLowerCase();
                
                if (headerLower.includes(keywordLower)) {
                    console.log('Match gefunden:', header, 'mit Keyword:', keyword);
                    return header;
                }
            }
        }
        
        // Noch ein letzter Versuch mit speziellen Fallback-Werten für die Zeit
        if (keywords.includes('min:sec')) {
            // Wenn wir nach der Zeitspalte suchen und nichts finden, 
            // dann versuche es mit dem 7. Element (Index 6), da dies in deinem Format die Zeitspalte ist
            if (headers.length > 6) {
                console.log('Fallback zur Position 7 (Index 6) für Zeitspalte:', headers[6]);
                return headers[6];
            }
        }
        
        // Fallback für Fehlerspalte - typischerweise an Position 5 (Index 4) in deinem Format
        if (keywords.includes('fehler')) {
            if (headers.length > 4) {
                console.log('Fallback zur Position 5 (Index 4) für Fehlerspalte:', headers[4]);
                return headers[4];
            }
        }
        
        console.log('Keine passende Spalte gefunden für Keywords:', keywords);
        return null;
    }
    
    function parseCSV(csvText) {
        // Versuche, den Trennzeichen automatisch zu erkennen (Komma oder Semikolon)
        const delimiter = csvText.includes(';') ? ';' : ',';
        
        const lines = csvText.split(/\r\n|\n/);
        
        // Unicode-Nullbytes und andere problematische Zeichen aus dem gesamten Text entfernen
        // Entferne Nullbytes aus dem Header
        const headerLine = lines[0].replace(/\u0000/g, '');
        
        // Spaltenüberschriften bereinigen
        const headers = headerLine.split(delimiter).map(header => {
            // Entferne Anführungszeichen, Leerzeichen am Anfang und Ende
            return header.trim()
                .replace(/^["']|["']$/g, '')  // Anführungszeichen am Anfang/Ende entfernen
                .replace(/\uFEFF/g, '')       // BOM (Byte Order Mark) entfernen
                .replace(/\u200B/g, '');      // Zero-Width Space entfernen
        });
        
        console.log('Bereinigte Headers:', headers);
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            // Entferne Nullbytes aus der Zeile
            const cleanedLine = lines[i].replace(/\u0000/g, '');
            
            const values = cleanedLine.split(delimiter);
            if (values.length !== headers.length) {
                console.warn(`Zeile ${i} hat eine andere Anzahl von Werten als die Kopfzeile.`);
                continue;
            }
            
            const entry = {};
            headers.forEach((header, index) => {
                // Auch die Werte bereinigen
                entry[header] = values[index].trim()
                    .replace(/^["']|["']$/g, '');  // Anführungszeichen am Anfang/Ende entfernen
            });
            
            data.push(entry);
        }
        
        return data;
    }
    
    function calculateRanking(data, timeColumn, errorColumn, timeWeight, errorWeight) {
        console.log(`Berechne Ranking mit Spalten: Zeit='${timeColumn}', Fehler='${errorColumn}'`);
        
        // Überprüfen, ob Zeit und Fehler numerisch sind
        const results = data.map(entry => {
            // Zeitformatierung berücksichtigen (mm:ss.ms oder nur Sekunden)
            let timeValue;
            if (entry[timeColumn].includes(':')) {
                const [minutes, seconds] = entry[timeColumn].split(':');
                timeValue = parseFloat(minutes) * 60 + parseFloat(seconds);
            } else {
                timeValue = parseFloat(entry[timeColumn]);
            }
            
            // Fehler parsen und sicherstellen, dass es eine Zahl ist
            let errorValue;
            // Bei CSV-Datei mit Format "Benutzername;Nachname;Vorname;Note;Fehler;Anschl?ge;min:sec;"
            // Direkter Zugriff auf den Wert in der "Fehler"-Spalte
            if (errorColumn === 'Fehler') {
                errorValue = parseInt(entry['Fehler'], 10);
                console.log(`Direkter Fehler-Zugriff für ${getParticipantName(entry)}: ${errorValue}`);
                
                // Prüfen, ob der Fehlerwert gültig ist
                if (isNaN(errorValue)) {
                    console.warn('Ungültiger Fehler-Wert, setze auf 0');
                    errorValue = 0;
                }
            } else {
                const errorRaw = entry[errorColumn].toString().trim();
                console.log(`Fehler-Rohwert für ${getParticipantName(entry)}: "${errorRaw}" (Typ: ${typeof errorRaw})`);
                
                // Verschiedene Formatierungen für Fehler berücksichtigen
                if (errorRaw === '') {
                    errorValue = 0; // Leere Werte als 0 Fehler interpretieren
                } else if (
                    errorRaw.toLowerCase() === 'keine' || 
                    errorRaw.toLowerCase() === 'none' ||
                    errorRaw.toLowerCase() === '0' ||
                    errorRaw.toLowerCase().includes('keine fehler') ||
                    errorRaw.toLowerCase().includes('no error') ||
                    errorRaw.toLowerCase() === 'kein fehler' ||
                    errorRaw.toLowerCase() === 'no errors'
                ) {
                    errorValue = 0;
                } else {
                    // Suche nach Zahlen im Text
                    const numberMatch = errorRaw.match(/\d+[,.]?\d*/);
                    if (numberMatch) {
                        // Extrahiere die gefundene Zahl und ersetze Komma durch Punkt
                        const normalizedError = numberMatch[0].replace(/,/g, '.');
                        errorValue = parseFloat(normalizedError);
                        console.log(`Fehlerextraktion aus Text: "${errorRaw}" → "${normalizedError}" → ${errorValue}`);
                    } else {
                        // Fallback: Versuche die gesamte Zeichenkette zu parsen
                        const normalizedError = errorRaw.replace(/,/g, '.');
                        errorValue = parseFloat(normalizedError);
                        console.log(`Fehlerkonvertierung: "${errorRaw}" → "${normalizedError}" → ${errorValue}`);
                    }
                }
                
                // Prüfen, ob die Werte gültige Zahlen sind
                if (isNaN(errorValue)) {
                    console.warn('Ungültiger Fehlerwert gefunden:', errorRaw, 'Setze auf 0');
                    errorValue = 0; // Bei ungültigen Fehlerwerten Standard 0 setzen
                }
            }
            
            // Prüfen, ob die Zeitwerte gültig sind
            if (isNaN(timeValue)) {
                console.warn('Ungültige Zeit gefunden:', entry[timeColumn]);
                return null;
            }
            
            console.log(`Teilnehmer "${getParticipantName(entry)}": Zeit = ${timeValue}, Fehler = ${errorValue}`);
            
            // Punktzahl berechnen (niedrigere Punktzahl ist besser)
            const score = timeValue * timeWeight + errorValue * errorWeight;
            
            return {
                ...entry,
                timeValue,
                errorValue,
                score
            };
        }).filter(entry => entry !== null);
        
        // Nach Punktzahl sortieren (aufsteigend)
        return results.sort((a, b) => a.score - b.score);
    }
    
    function displayResults(results) {
        resultsBody.innerHTML = '';
        
        // Top-3-Podestplätze füllen mit mehr Details
        if (results.length > 0) {
            const first = results[0];
            document.getElementById('first-place-name').textContent = getParticipantName(first);
            // Zusätzliche Statistiken für Gold-Medaille
            const firstStats = `${first.score.toFixed(1)} Pkt | ${formatTime(first.timeValue)} | ${first.errorValue} Fehler`;
            document.querySelector('.first-place .winner-stats').textContent = firstStats;
        }
        if (results.length > 1) {
            const second = results[1];
            document.getElementById('second-place-name').textContent = getParticipantName(second);
            // Zusätzliche Statistiken für Silber-Medaille
            const secondStats = `${second.score.toFixed(1)} Pkt | ${formatTime(second.timeValue)} | ${second.errorValue} Fehler`;
            document.querySelector('.second-place .winner-stats').textContent = secondStats;
        }
        if (results.length > 2) {
            const third = results[2];
            document.getElementById('third-place-name').textContent = getParticipantName(third);
            // Zusätzliche Statistiken für Bronze-Medaille
            const thirdStats = `${third.score.toFixed(1)} Pkt | ${formatTime(third.timeValue)} | ${third.errorValue} Fehler`;
            document.querySelector('.third-place .winner-stats').textContent = thirdStats;
        }
        
        results.forEach((entry, index) => {
            const row = document.createElement('tr');
            
            // Rang
            const rankCell = document.createElement('td');
            rankCell.textContent = index + 1;
            row.appendChild(rankCell);
            
            // Name
            const nameCell = document.createElement('td');
            nameCell.textContent = getParticipantName(entry);
            row.appendChild(nameCell);
            
            // Zeit formatieren (mm:ss)
            const timeCell = document.createElement('td');
            timeCell.textContent = formatTime(entry.timeValue);
            row.appendChild(timeCell);
            
            // Fehler
            const errorCell = document.createElement('td');
            errorCell.textContent = entry.errorValue;
            row.appendChild(errorCell);
            
            // Punktzahl
            const scoreCell = document.createElement('td');
            scoreCell.textContent = entry.score.toFixed(2);
            row.appendChild(scoreCell);
            
            resultsBody.appendChild(row);
        });
        
        // Upload-Button ausblenden, da eine Tabelle hinzugefügt wurde
        uploadButton.style.display = 'none';
        
        // Diagramm erstellen
        createChart(results);
    }
    
    // Formatiert die Zeit als mm:ss
    function formatTime(timeInSeconds) {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = (timeInSeconds % 60).toFixed(0).padStart(2, '0');
        return `${minutes}:${seconds}`;
    }
    
    // Hilfsfunktion zur Ermittlung des Namens
    function getParticipantName(entry) {
        // Debug-Ausgabe der verfügbaren Felder
        console.log('Verfügbare Felder für Teilnehmer:', Object.keys(entry));
        
        let name = '';
        
        // Zuerst testen wir exakt auf bekannte Spaltennamen
        const usernameField = 'Benutzername';
        const firstnameField = 'Vorname';
        const lastnameField = 'Nachname';
        
        if (entry.hasOwnProperty(usernameField) && entry[usernameField]) {
            name = entry[usernameField];
            // SeiSti_ Präfix entfernen
            name = name.replace(/SeiSti_/g, '');
        } else if (
            entry.hasOwnProperty(firstnameField) && 
            entry.hasOwnProperty(lastnameField) && 
            entry[firstnameField] && 
            entry[lastnameField]
        ) {
            name = `${entry[firstnameField]} ${entry[lastnameField]}`;
        } else if (entry.hasOwnProperty('Name') && entry['Name']) {
            name = entry['Name'];
        } else if (entry.hasOwnProperty('name') && entry['name']) {
            name = entry['name'];
        } else {
            // Wenn keine bekannte Spalte gefunden wurde, suchen wir nach Schlüsselwörtern
            const nameKeys = Object.keys(entry).filter(key => 
                key.toLowerCase().includes('name') || 
                key.toLowerCase().includes('user') ||
                key.toLowerCase().includes('teilnehmer')
            );
            
            if (nameKeys.length > 0) {
                const firstKey = nameKeys[0];
                name = entry[firstKey];
                // SeiSti_ Präfix entfernen, falls vorhanden
                name = name.replace(/SeiSti_/g, '');
            } else {
                name = 'Teilnehmer';
            }
        }
        
        return name;
    }
    
    // Funktion zum Erstellen des Diagramms
    function createChart(results) {
        const ctx = document.getElementById('rankingChart').getContext('2d');
        
        // Alle Ergebnisse verwenden
        const allResults = results;
        
        const names = allResults.map(entry => getParticipantName(entry));
        
        const scores = allResults.map(entry => entry.score);
        const times = allResults.map(entry => entry.timeValue);
        const errors = allResults.map(entry => entry.errorValue);
        
        // Bestehende Grafik entfernen, falls vorhanden
        if (window.rankingChart && typeof window.rankingChart.destroy === 'function') {
            window.rankingChart.destroy();
        }
        
        // Horizontale Balken für bessere Lesbarkeit verwenden, wenn mehr als 10 Teilnehmer
        const useHorizontalBars = results.length > 10;
        
        // Neues Diagramm erstellen
        window.rankingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: names,
                datasets: [
                    {
                        label: 'Punkte',
                        data: scores,
                        backgroundColor: 'rgba(52, 152, 219, 0.7)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 1,
                        order: 1,
                        barPercentage: 0.7
                    },
                    {
                        label: 'Zeit',
                        data: times,
                        backgroundColor: 'rgba(241, 196, 15, 0.7)',
                        borderColor: 'rgba(241, 196, 15, 1)',
                        borderWidth: 1,
                        order: 2,
                        barPercentage: 0.7
                    },
                    {
                        label: 'Fehler×10',
                        data: errors.map(error => error * 10), // Multiplikation zur besseren Sichtbarkeit
                        backgroundColor: 'rgba(231, 76, 60, 0.7)',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 1,
                        order: 3,
                        barPercentage: 0.7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: useHorizontalBars ? 'y' : 'x', // Horizontale Balken wenn viele Teilnehmer
                layout: {
                    padding: {
                        left: 5,
                        right: 10,
                        top: 5,
                        bottom: 5
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 10
                            },
                            // Horizontale Achsenbeschriftungen rotieren, wenn vertikale Balken
                            maxRotation: useHorizontalBars ? 0 : 45,
                            minRotation: useHorizontalBars ? 0 : 45
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 10
                            },
                            // Die y-Achse muss bei mehr Teilnehmern angepasst werden
                            autoSkip: useHorizontalBars ? false : true,
                            maxTicksLimit: useHorizontalBars ? 1000 : 20
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Alle Teilnehmer',
                        font: {
                            size: 14
                        },
                        padding: {
                            top: 5,
                            bottom: 5
                        }
                    },
                    legend: {
                        position: 'top',
                        align: 'center',
                        labels: {
                            boxWidth: 10,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 8,
                            font: {
                                size: 10
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleFont: {
                            size: 12
                        },
                        bodyFont: {
                            size: 11
                        },
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (label.includes('Zeit')) {
                                        label += formatTime(context.parsed.y);
                                    } else if (label.includes('Fehler')) {
                                        // Originalen Fehlerwert anzeigen (ohne Multiplikation)
                                        label += (context.parsed.y / 10).toFixed(0);
                                    } else {
                                        label += context.parsed.y.toFixed(1);
                                    }
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }
}); 