// script.js (with on-page debugging status messages)

// --- Configuration & Global Variables ---
const LOCAL_STORAGE_KEY_LINKS = 'interactiveLinkManagerData';
const LOCAL_STORAGE_KEY_SORT = 'interactiveLinkManagerSortCriteria';
let links = [];
let currentSortCriteria = 'dateAdded_desc';

// DOM element variables
let linkListElement;
let clickLogElement;
let showAddLinkDialogBtn;
let sortCriteriaSelect;

// --- Helper: On-Page Status Update for Debugging ---
// This function will be called only after linkListElement is attempted to be defined.
function setStatus(message) {
    if (linkListElement) {
        try {
            linkListElement.innerHTML = `<li>Status: ${message}</li>`;
        } catch (e) {
            // Fallback if innerHTML fails for some reason on linkListElement
            console.error("Failed to set status in linkListElement:", e);
            alert(`Status (fallback): ${message}`);
        }
    } else {
        // This case should ideally be caught by the critical element check later,
        // but as an early fallback if linkListElement is the one missing.
        alert(`Status (linkListElement not found): ${message}`);
    }
    console.log(`Status: ${message}`); // Also log to console for completeness
}

// --- Helper: Check Local Storage Availability ---
function isLocalStorageAvailable() {
    try {
        const testKey = '__localStorageTest__';
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        console.error("Local Storage check failed:", e);
        return false;
    }
}

// --- Core Functions (parseRelativeTime, date helpers, save/load, sort, logToPage, handlers, renderLinks, setupAddButton) ---
// These functions (getDefaultLinks, parseRelativeTimeAndCalcFutureDate, getLocalDateTimePickerValue,
// getISOStringFromDateTimePickerValue, saveLinksToLocalStorage, saveSortCriteriaToLocalStorage,
// loadSortCriteriaFromLocalStorage, sortLinks, logToPage, handleRemoveLink, makeScheduleEditable,
// handleLinkClick, renderLinks, setupAddLinkButtonListener)
// should be the SAME as the versions from the "Give me the code to latest Script" response.
// For brevity, I will not repeat all of them here, but ensure you have them from that previous response.
// The loadLinksFromLocalStorage function below is the one that had specific robustness checks.

function parseRelativeTimeAndCalcFutureDate(inputString) {
    if (!inputString || typeof inputString !== 'string') return null; // Added type check

    const cleanedInput = inputString.toLowerCase().trim();
    const regex = /^(\d+(\.\d+)?)\s+(hour|hr|minute|min|day)s?\s+(?:from\s+now|later|hence)$/i;
    const match = cleanedInput.match(regex);

    if (match) {
        const value = parseFloat(match[1]);
        let unit = match[3];

        if (unit === 'hr') unit = 'hour';
        if (unit === 'min') unit = 'minute';

        let futureDate = new Date();

        switch (unit) {
            case 'hour':
                futureDate.setTime(futureDate.getTime() + value * 60 * 60 * 1000);
                break;
            case 'minute':
                futureDate.setTime(futureDate.getTime() + value * 60 * 1000);
                break;
            case 'day':
                futureDate.setTime(futureDate.getTime() + value * 24 * 60 * 60 * 1000);
                break;
            default:
                console.warn("parseRelativeTimeAndCalcFutureDate: Unknown unit - ", unit);
                return null;
        }
        console.log(`Parsed "${inputString}" to: ${futureDate.toISOString()}`);
        return futureDate;
    }
    // console.log(`Could not parse relative time: "${inputString}"`); // Keep this less verbose unless debugging parsing
    return null;
}

function getLocalDateTimePickerValue(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return ''; // Handle invalid date string
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return localDate.toISOString().slice(0, 16);
    } catch (e) {
        console.error("Error converting ISO to datetime-local value:", e);
        return '';
    }
}

function getISOStringFromDateTimePickerValue(localDateTimeString) {
    if (!localDateTimeString) return null;
    try {
        const date = new Date(localDateTimeString);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
    } catch (e) {
        console.error("Error converting datetime-local value to ISO string:", e);
        return null;
    }
}

function getDefaultLinks() {
    const now = Date.now();
    console.log("Using default links.");
    return [
        { text: "Google (Default)", url: "https://www.google.com", scheduledTimeDisplay: "Tomorrow AM", dateAdded: now - 200000 },
        { text: "Wikipedia (Default)", url: "https://www.wikipedia.org", dateAdded: now - 100000 }
    ];
}

// THIS IS THE ROBUST VERSION FROM THE PREVIOUS "Stuck loading links" response
function loadLinksFromLocalStorage() {
    console.log("Attempting to load links from Local Storage. Key:", LOCAL_STORAGE_KEY_LINKS);
    try {
        const storedLinks = localStorage.getItem(LOCAL_STORAGE_KEY_LINKS);
        if (storedLinks) {
            let parsedLinks = JSON.parse(storedLinks);
            if (Array.isArray(parsedLinks)) {
                parsedLinks = parsedLinks.map(link => {
                    const migratedLink = {
                        ...link,
                        dateAdded: link.dateAdded === undefined ? 0 : link.dateAdded
                    };
                    if (migratedLink.hasOwnProperty('scheduledTime') && migratedLink.scheduledDateTimeActual === undefined) {
                        if (typeof migratedLink.scheduledTime === 'string' && migratedLink.scheduledTime.trim() !== "") {
                            migratedLink.scheduledTimeDisplay = migratedLink.scheduledTime;
                            const calculatedDate = parseRelativeTimeAndCalcFutureDate(migratedLink.scheduledTime);
                            if (calculatedDate) {
                                migratedLink.scheduledDateTimeActual = calculatedDate.toISOString();
                            }
                        } else if (typeof migratedLink.scheduledTime === 'string') { // Empty or whitespace string
                            migratedLink.scheduledTimeDisplay = migratedLink.scheduledTime;
                        }
                        delete migratedLink.scheduledTime;
                    }
                    return migratedLink;
                });
                console.log("Parsed and migrated links from Local Storage:", parsedLinks);
                return parsedLinks;
            } else {
                console.warn("Stored links data is not an array. Falling back to defaults.");
            }
        } else {
            console.log("No links data found in Local Storage. Falling back to defaults.");
        }
    } catch (e) {
        console.error("Error processing links from Local Storage:", e, "Falling back to defaults.");
        // localStorage.removeItem(LOCAL_STORAGE_KEY_LINKS); // Optional: clear corrupted data
    }
    return getDefaultLinks();
}


function loadSortCriteriaFromLocalStorage() {
    // ... (same as before)
    const storedSortCriteria = localStorage.getItem(LOCAL_STORAGE_KEY_SORT);
    if (storedSortCriteria) {
        console.log("Loaded sort criteria from Local Storage:", storedSortCriteria);
        return storedSortCriteria;
    }
    console.log("No sort criteria in Local Storage, using default:", currentSortCriteria);
    return currentSortCriteria;
}

function sortLinks() {
    // ... (same as before)
    console.log("Sorting links by:", currentSortCriteria);
    links.sort((a, b) => {
        switch (currentSortCriteria) {
            case 'dateAdded_desc': return (b.dateAdded || 0) - (a.dateAdded || 0);
            case 'dateAdded_asc': return (a.dateAdded || 0) - (b.dateAdded || 0);
            case 'text_asc': return a.text.localeCompare(b.text);
            case 'text_desc': return b.text.localeCompare(a.text);
            case 'scheduledTime_asc':
                if (a.scheduledDateTimeActual && !b.scheduledDateTimeActual) return -1;
                if (!a.scheduledDateTimeActual && b.scheduledDateTimeActual) return 1;
                if (a.scheduledDateTimeActual && b.scheduledDateTimeActual) return new Date(a.scheduledDateTimeActual) - new Date(b.scheduledDateTimeActual);
                if (a.scheduledTimeDisplay && !b.scheduledTimeDisplay) return -1;
                if (!a.scheduledTimeDisplay && b.scheduledTimeDisplay) return 1;
                if (a.scheduledTimeDisplay && b.scheduledTimeDisplay) return a.scheduledTimeDisplay.localeCompare(b.scheduledTimeDisplay);
                return 0;
            case 'scheduledTime_desc':
                if (a.scheduledDateTimeActual && !b.scheduledDateTimeActual) return -1;
                if (!a.scheduledDateTimeActual && b.scheduledDateTimeActual) return 1;
                if (a.scheduledDateTimeActual && b.scheduledDateTimeActual) return new Date(b.scheduledDateTimeActual) - new Date(a.scheduledDateTimeActual);
                if (a.scheduledTimeDisplay && !b.scheduledTimeDisplay) return -1;
                if (!a.scheduledTimeDisplay && b.scheduledTimeDisplay) return 1;
                if (a.scheduledTimeDisplay && b.scheduledTimeDisplay) return b.scheduledTimeDisplay.localeCompare(a.scheduledTimeDisplay);
                return 0;
            default: return 0;
        }
    });
    saveSortCriteriaToLocalStorage();
}

function logToPage(message) {
    // ... (same as before)
    const now = new Date();
    const timestamp = now.toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
    const logEntry = document.createElement('p');
    logEntry.classList.add('log-entry');
    logEntry.textContent = `[${timestamp}] ${message}`;
    if (clickLogElement && clickLogElement.firstChild) {
        clickLogElement.insertBefore(logEntry, clickLogElement.firstChild);
    } else if (clickLogElement) {
        clickLogElement.appendChild(logEntry);
    } else {
        console.warn("logToPage: clickLogElement not found.");
    }
}

function handleRemoveLink(linkToRemove) {
    // ... (same as before)
    if (confirm(`Are you sure you want to remove the link "${linkToRemove.text}"?`)) {
        const index = links.findIndex(link => link.url === linkToRemove.url && link.text === linkToRemove.text);
        if (index > -1) {
            links.splice(index, 1);
            saveLinksToLocalStorage();
            renderLinks();
            logToPage(`Link "${linkToRemove.text}" removed.`);
        } else {
            logToPage(`Error: Could not find link "${linkToRemove.text}" to remove.`);
        }
    }
}

function makeScheduleEditable(linkObject, displaySpanElement) {
    // ... (same as before, ensure it uses getLocalDateTimePickerValue and getISOStringFromDateTimePickerValue)
    const originalDateTimeActual = linkObject.scheduledDateTimeActual;
    const originalTimeDisplay = linkObject.scheduledTimeDisplay;
    displaySpanElement.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'datetime-local';
    input.className = 'schedule-datetime-input';
    input.value = getLocalDateTimePickerValue(linkObject.scheduledDateTimeActual);
    let hasBeenFinalized = false;

    const finalizeEdit = (saveChanges) => {
        if (hasBeenFinalized) return;
        hasBeenFinalized = true;
        if (input.parentNode) { input.parentNode.removeChild(input); }
        let modifiedInThisEdit = false;
        if (saveChanges) {
            const newPickerValue = input.value;
            if (newPickerValue) {
                const newIsoString = getISOStringFromDateTimePickerValue(newPickerValue);
                if (newIsoString) {
                    if (linkObject.scheduledDateTimeActual !== newIsoString) {
                        linkObject.scheduledDateTimeActual = newIsoString;
                        linkObject.scheduledTimeDisplay = new Date(newIsoString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                        modifiedInThisEdit = true;
                        logToPage(`Reminder for "${linkObject.text}" updated via calendar to: ${linkObject.scheduledTimeDisplay}`);
                    }
                } else {
                    linkObject.scheduledDateTimeActual = originalDateTimeActual;
                    linkObject.scheduledTimeDisplay = originalTimeDisplay;
                    logToPage(`Invalid date from calendar for "${linkObject.text}". Change reverted.`);
                }
            } else {
                if (linkObject.scheduledDateTimeActual || linkObject.scheduledTimeDisplay) {
                    delete linkObject.scheduledDateTimeActual;
                    delete linkObject.scheduledTimeDisplay;
                    modifiedInThisEdit = true;
                    logToPage(`Reminder for "${linkObject.text}" cleared via calendar.`);
                }
            }
        } else {
            linkObject.scheduledDateTimeActual = originalDateTimeActual;
            linkObject.scheduledTimeDisplay = originalTimeDisplay;
            logToPage(`Calendar edit for "${linkObject.text}" cancelled.`);
        }
        if (modifiedInThisEdit) {
            saveLinksToLocalStorage();
            sortLinks();
        }
        renderLinks();
    };

    input.addEventListener('blur', () => { if (!hasBeenFinalized) { finalizeEdit(true); } });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); finalizeEdit(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finalizeEdit(false); }
    });
    displaySpanElement.parentNode.insertBefore(input, displaySpanElement.nextSibling);
    input.focus();
}

function handleLinkClick(event, linkObject) {
    // ... (same as before, ensure it uses parseRelativeTimeAndCalcFutureDate correctly)
    event.preventDefault();
    const url = linkObject.url;
    const linkText = linkObject.text;
    let baseActivityMessage = `Clicked "${linkText}" (${url}).`;
    let detailedReminderMessage = "";
    let linksModified = false;

    if (confirm(`You clicked on "${linkText}".\nDo you want to visit ${url} now?`)) {
        detailedReminderMessage = ` User chose to visit immediately. Navigating...`;
        logToPage(baseActivityMessage + detailedReminderMessage);
        window.location.href = url;
    } else {
        detailedReminderMessage = ` User chose NOT to visit immediately.`;
        const currentScheduledTimeForPrompt = linkObject.scheduledTimeDisplay ||
                                           (linkObject.scheduledDateTimeActual ? new Date(linkObject.scheduledDateTimeActual).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'}) : "");
        const visitLaterTimeInput = prompt( /* ... prompt message ... */ currentScheduledTimeForPrompt);

        if (visitLaterTimeInput !== null) {
            const trimmedInput = visitLaterTimeInput.trim();
            if (trimmedInput === "") { /* ... clear logic ... */
                if (linkObject.scheduledTimeDisplay || linkObject.scheduledDateTimeActual) {
                    delete linkObject.scheduledTimeDisplay; delete linkObject.scheduledDateTimeActual; linksModified = true;
                }
                detailedReminderMessage += ` Reminder cleared via prompt.`;
            } else {
                const calculatedDate = parseRelativeTimeAndCalcFutureDate(trimmedInput);
                if (calculatedDate) { /* ... set actual and display ... */
                    const newIso = calculatedDate.toISOString();
                    if (linkObject.scheduledDateTimeActual !== newIso || linkObject.scheduledTimeDisplay !== trimmedInput) {
                        linkObject.scheduledDateTimeActual = newIso; linkObject.scheduledTimeDisplay = trimmedInput; linksModified = true;
                    }
                    detailedReminderMessage += ` Reminder set via prompt to: ${new Date(linkObject.scheduledDateTimeActual).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'})} (from input "${trimmedInput}").`;
                } else { /* ... set display only ... */
                    if (linkObject.scheduledTimeDisplay !== trimmedInput || linkObject.scheduledDateTimeActual) {
                        linkObject.scheduledTimeDisplay = trimmedInput; delete linkObject.scheduledDateTimeActual; linksModified = true;
                    }
                    detailedReminderMessage += ` Reminder text set via prompt to: "${trimmedInput}" (not a parseable relative time).`;
                }
            }
        } else { detailedReminderMessage += ` User declined to update reminder via prompt.`; }

        logToPage(baseActivityMessage + detailedReminderMessage);
        if (linksModified) { saveLinksToLocalStorage(); sortLinks(); }
        renderLinks();
    }
}

function renderLinks() {
    // ... (same as before, ensure it calls makeScheduleEditable on click)
    if (!linkListElement) { console.error("renderLinks: linkListElement not found."); return; }
    linkListElement.innerHTML = '';
    if (!links || links.length === 0) { /* ... empty list message ... */
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'No links. Add one below!';
        emptyLi.style.justifyContent = 'center'; emptyLi.style.color = '#6c757d';
        linkListElement.appendChild(emptyLi); return;
    }
    links.forEach(linkObj => { /* ... create elements ... */
        const listItem = document.createElement('li');
        const linkTextContainer = document.createElement('div'); linkTextContainer.className = 'link-text-container';
        const anchorTag = document.createElement('a'); anchorTag.href = linkObj.url; anchorTag.textContent = linkObj.text;
        anchorTag.title = `Visit ${linkObj.text}`;
        anchorTag.addEventListener('click', (event) => handleLinkClick(event, linkObj));
        linkTextContainer.appendChild(anchorTag); listItem.appendChild(linkTextContainer);

        const scheduleDisplaySpan = document.createElement('span'); scheduleDisplaySpan.className = 'scheduled-time';
        let displayString = ""; let titleHint = "";
        if (linkObj.scheduledDateTimeActual) { /* ... set displayString and titleHint for actual date ... */
            displayString = `Visit: ${new Date(linkObj.scheduledDateTimeActual).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
            if (linkObj.scheduledTimeDisplay && parseRelativeTimeAndCalcFutureDate(linkObj.scheduledTimeDisplay)) { titleHint = `Original: "${linkObj.scheduledTimeDisplay}"`; }
            else if (linkObj.scheduledTimeDisplay) { titleHint = `Set as: "${linkObj.scheduledTimeDisplay}"`; }
        } else if (linkObj.scheduledTimeDisplay) { displayString = `Visit: ${linkObj.scheduledTimeDisplay}`;
        } else { displayString = "Set Reminder"; scheduleDisplaySpan.style.opacity = "0.6"; scheduleDisplaySpan.style.fontStyle = "italic"; }
        scheduleDisplaySpan.textContent = displayString; if (titleHint) { scheduleDisplaySpan.title = titleHint; }
        scheduleDisplaySpan.style.cursor = 'pointer';
        scheduleDisplaySpan.addEventListener('click', (e) => { e.stopPropagation(); makeScheduleEditable(linkObj, scheduleDisplaySpan); });
        listItem.appendChild(scheduleDisplaySpan);

        const removeButton = document.createElement('button'); removeButton.textContent = 'Remove'; removeButton.className = 'remove-btn';
        removeButton.title = `Remove: ${linkObj.text}`;
        removeButton.addEventListener('click', (e) => { e.stopPropagation(); handleRemoveLink(linkObj); });
        listItem.appendChild(removeButton);
        linkListElement.appendChild(listItem);
    });
}

function setupAddLinkButtonListener() {
    // ... (same as before, ensure it sets dateAdded)
    if (showAddLinkDialogBtn) {
        showAddLinkDialogBtn.addEventListener('click', () => { /* ... prompt logic ... */
            const newLinkText = prompt("Link text:"); if (newLinkText === null || !newLinkText.trim()) { alert("Text needed."); return; }
            const newLinkUrl = prompt("Link URL (e.g., https://example.com):"); if (newLinkUrl === null || !newLinkUrl.trim()) { alert("URL needed."); return; }
            let cleanUrl = newLinkUrl.trim();
            if (!cleanUrl.toLowerCase().startsWith('http://') && !cleanUrl.toLowerCase().startsWith('https://')) {
                if (confirm(`Add "https://"? URL: ${cleanUrl}`)) { cleanUrl = 'https://' + cleanUrl; }
                else { alert("Invalid URL."); return; }
            }
            const newLink = { text: newLinkText.trim(), url: cleanUrl, dateAdded: Date.now() };
            links.push(newLink); saveLinksToLocalStorage(); sortLinks(); renderLinks(); logToPage(`Link "${newLink.text}" added.`);
        });
    } else { console.error("Add button not found."); }
}


// --- Initial Setup (DOMContentLoaded with on-page status updates) ---
document.addEventListener('DOMContentLoaded', () => {
    // Assign linkListElement first to use it for immediate feedback
    linkListElement = document.getElementById('linkList'); // Critical for setStatus

    // Initialize other DOM element variables
    clickLogElement = document.getElementById('clickLog');
    showAddLinkDialogBtn = document.getElementById('showAddLinkDialogBtn');
    sortCriteriaSelect = document.getElementById('sortCriteria');

    // Call setStatus (defined at the top)
    setStatus("DOMContentLoaded event fired. Initializing...");

    // Critical elements check (uses setStatus for feedback)
    if (!linkListElement || !clickLogElement || !showAddLinkDialogBtn || !sortCriteriaSelect) {
        const missing = [];
        if (!linkListElement) missing.push("linkList (UL for links)"); // Be more specific
        if (!clickLogElement) missing.push("clickLog (DIV for logs)");
        if (!showAddLinkDialogBtn) missing.push("showAddLinkDialogBtn (Button to add links)");
        if (!sortCriteriaSelect) missing.push("sortCriteria (Dropdown for sorting)");

        const errorMsg = `Error: Critical HTML element(s) missing: ${missing.join(', ')}. App cannot start. Please verify your index.html.`;
        setStatus(errorMsg); // Show error in the status area

        // Add a more prominent error to the body as well
        const errorDiv = document.createElement('div');
        errorDiv.textContent = errorMsg;
        errorDiv.style.color = 'red';
        errorDiv.style.fontWeight = 'bold';
        errorDiv.style.padding = '20px';
        errorDiv.style.textAlign = 'center';
        errorDiv.style.border = '2px solid red';
        errorDiv.style.backgroundColor = '#ffe0e0';
        if (document.body) { // Check if body exists before prepending
            document.body.prepend(errorDiv);
        } else { // Very unlikely, but a fallback
            alert(errorMsg);
        }
        return; // Stop further execution
    }

    setStatus("DOM elements selected. Checking Local Storage...");

    if (!isLocalStorageAvailable()) {
        setStatus("Local Storage is not available. Using temporary data (links will not be saved or loaded across sessions).");
        // loadLinksFromLocalStorage will return default links in this case if localStorage access fails within it.
    } else {
        setStatus("Local Storage available. Loading links...");
    }

    links = loadLinksFromLocalStorage();
    setStatus(`Links loaded/defaulted (${links.length} found). Loading sort criteria...`);

    currentSortCriteria = loadSortCriteriaFromLocalStorage();
    setStatus(`Sort criteria loaded ('${currentSortCriteria}'). Sorting links...`);

    sortLinks(); // Apply sort before first render
    setStatus("Links sorted. Rendering main list...");

    renderLinks(); // This should replace the status message with the actual list
    // If stuck on "Rendering main list...", then renderLinks() itself has an issue.

    if (linkListElement && linkListElement.innerHTML.includes("Status: Rendering main list...")) {
        // This means renderLinks might have completed but didn't clear the status,
        // or an error occurred within renderLinks after this point.
        // However, renderLinks starts with linkListElement.innerHTML = '';
        // So if it's stuck on this message, renderLinks likely didn't execute or complete.
    }

    // The setup for add button listener should happen after elements are confirmed
    setupAddLinkButtonListener();
    setStatus("Initialization complete. App ready."); // This final status might be quickly replaced by logs from logToPage

    logToPage("Link manager initialized. Current time: " + new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }));
    // The logToPage might clear the "App ready" status from the list, which is fine.
    // The important part is to see how far these status messages progress.
});
