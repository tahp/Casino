// script.js (Complete, Updated, with extensive on-page debugging)

// --- Configuration & Global Variables ---
const LOCAL_STORAGE_KEY_LINKS = 'interactiveLinkManagerData_v2'; // Using v2 to ensure fresh start
const LOCAL_STORAGE_KEY_SORT = 'interactiveLinkManagerSortCriteria_v2'; // Using v2
let links = [];
let currentSortCriteria = 'dateAdded_desc';

// DOM element variables
let linkListElement;
let clickLogElement;
let showAddLinkDialogBtn;
let sortCriteriaSelect;

// --- Helper: On-Page Status Update for Debugging ---
function setStatus(message) {
    if (linkListElement) {
        try {
            const statusLi = document.createElement('li');
            statusLi.textContent = `Status: ${message}`;
            statusLi.style.fontStyle = 'italic';
            statusLi.style.color = '#555';
            linkListElement.innerHTML = '';
            linkListElement.appendChild(statusLi);
        } catch (e) {
            console.error("Failed to set status in linkListElement:", e);
            alert(`Status (fallback): ${message}`);
        }
    } else {
        alert(`Status (linkListElement not yet available): ${message}`);
    }
    console.log(`Status: ${message}`);
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

// --- Core Functions ---
function parseRelativeTimeAndCalcFutureDate(inputString) {
    if (!inputString || typeof inputString !== 'string') return null;
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
            case 'hour': futureDate.setTime(futureDate.getTime() + value * 60 * 60 * 1000); break;
            case 'minute': futureDate.setTime(futureDate.getTime() + value * 60 * 1000); break;
            case 'day': futureDate.setTime(futureDate.getTime() + value * 24 * 60 * 60 * 1000); break;
            default: console.warn("parseRelativeTime: Unknown unit - ", unit); return null;
        }
        console.log(`Parsed "${inputString}" to: ${futureDate.toISOString()}`);
        return futureDate;
    }
    return null;
}

function getLocalDateTimePickerValue(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return localDate.toISOString().slice(0, 16);
    } catch (e) { console.error("Error converting ISO to datetime-local value:", e); return ''; }
}

function getISOStringFromDateTimePickerValue(localDateTimeString) {
    if (!localDateTimeString) return null;
    try {
        const date = new Date(localDateTimeString);
        if (isNaN(date.getTime())) return null;
        return date.toISOString();
    } catch (e) { console.error("Error converting datetime-local value to ISO string:", e); return null; }
}

function saveLinksToLocalStorage() {
    if (!isLocalStorageAvailable()) return;
    try { localStorage.setItem(LOCAL_STORAGE_KEY_LINKS, JSON.stringify(links)); }
    catch (e) { console.error("Could not save links to Local Storage:", e); }
}

function saveSortCriteriaToLocalStorage() {
    if (!isLocalStorageAvailable()) return;
    try { localStorage.setItem(LOCAL_STORAGE_KEY_SORT, currentSortCriteria); }
    catch (e) { console.error("Could not save sort criteria to Local Storage:", e); }
}

function getDefaultLinks() {
    const now = Date.now();
    console.log("Using default links.");
    return [
        { text: "Google (Default)", url: "https://www.google.com", scheduledTimeDisplay: "Tomorrow AM", dateAdded: now - 200000 },
        { text: "Wikipedia (Default)", url: "https://www.wikipedia.org", dateAdded: now - 100000 }
    ];
}

function loadLinksFromLocalStorage() {
    console.log("Attempting to load links from Local Storage. Key:", LOCAL_STORAGE_KEY_LINKS);
    if (!isLocalStorageAvailable()) {
        console.warn("Local Storage not available during load. Using defaults.");
        return getDefaultLinks();
    }
    try {
        const storedLinks = localStorage.getItem(LOCAL_STORAGE_KEY_LINKS);
        if (storedLinks) {
            let parsedLinks = JSON.parse(storedLinks);
            if (Array.isArray(parsedLinks)) {
                parsedLinks = parsedLinks.map(link => {
                    const migratedLink = {
                        text: typeof link.text === 'string' ? link.text : "Untitled Link",
                        url: typeof link.url === 'string' ? link.url : "#",
                        ...link,
                        dateAdded: link.dateAdded === undefined ? 0 : Number(link.dateAdded) || 0,
                        scheduledTimeDisplay: typeof link.scheduledTimeDisplay === 'string' ? link.scheduledTimeDisplay : "",
                        scheduledDateTimeActual: typeof link.scheduledDateTimeActual === 'string' ? link.scheduledDateTimeActual : null
                    };
                    if (migratedLink.hasOwnProperty('scheduledTime')) {
                        if (typeof migratedLink.scheduledTime === 'string' && migratedLink.scheduledTime.trim() !== "" && !migratedLink.scheduledDateTimeActual) {
                            if (!migratedLink.scheduledTimeDisplay) {
                                migratedLink.scheduledTimeDisplay = migratedLink.scheduledTime;
                            }
                            const calculatedDate = parseRelativeTimeAndCalcFutureDate(migratedLink.scheduledTime);
                            if (calculatedDate) {
                                migratedLink.scheduledDateTimeActual = calculatedDate.toISOString();
                            }
                        } else if (typeof migratedLink.scheduledTime === 'string' && !migratedLink.scheduledTimeDisplay) {
                            migratedLink.scheduledTimeDisplay = migratedLink.scheduledTime;
                        }
                        delete migratedLink.scheduledTime;
                    }
                    if (migratedLink.scheduledDateTimeActual && isNaN(new Date(migratedLink.scheduledDateTimeActual).getTime())) {
                        console.warn("Invalid scheduledDateTimeActual found, clearing for link:", migratedLink.text);
                        migratedLink.scheduledDateTimeActual = null;
                    }
                    return migratedLink;
                });
                console.log("Parsed and migrated links from Local Storage:", parsedLinks);
                return parsedLinks;
            } else { console.warn("Stored links data is not an array. Falling back to defaults."); }
        } else { console.log("No links data found in Local Storage. Falling back to defaults."); }
    } catch (e) { console.error("Error processing links from Local Storage:", e, "Falling back to defaults."); }
    return getDefaultLinks();
}

function loadSortCriteriaFromLocalStorage() {
    if (!isLocalStorageAvailable()) { return currentSortCriteria; }
    const storedSortCriteria = localStorage.getItem(LOCAL_STORAGE_KEY_SORT);
    if (storedSortCriteria) { return storedSortCriteria; }
    return currentSortCriteria;
}

function sortLinks() {
    setStatus(`Attempting to sort links by: ${currentSortCriteria}... (Processing ${links.length} links)`);
    try {
        links.sort((a, b) => {
            const linkA = (typeof a === 'object' && a !== null) ? a : {};
            const linkB = (typeof b === 'object' && b !== null) ? b : {};
            switch (currentSortCriteria) {
                case 'dateAdded_desc': return (Number(linkB.dateAdded) || 0) - (Number(linkA.dateAdded) || 0);
                case 'dateAdded_asc': return (Number(linkA.dateAdded) || 0) - (Number(linkB.dateAdded) || 0);
                case 'text_asc': return (String(linkA.text || "")).localeCompare(String(linkB.text || ""));
                case 'text_desc': return (String(linkB.text || "")).localeCompare(String(linkA.text || ""));
                case 'scheduledTime_asc': {
                    let dateA = linkA.scheduledDateTimeActual ? new Date(linkA.scheduledDateTimeActual) : null;
                    let dateB = linkB.scheduledDateTimeActual ? new Date(linkB.scheduledDateTimeActual) : null;
                    if (dateA && isNaN(dateA.getTime())) dateA = null;
                    if (dateB && isNaN(dateB.getTime())) dateB = null;
                    if (dateA && !dateB) return -1; if (!dateA && dateB) return 1;
                    if (dateA && dateB) return dateA.getTime() - dateB.getTime();
                    const displayA = String(linkA.scheduledTimeDisplay || "");
                    const displayB = String(linkB.scheduledTimeDisplay || "");
                    return displayA.localeCompare(displayB);
                }
                case 'scheduledTime_desc': {
                    let dateA = linkA.scheduledDateTimeActual ? new Date(linkA.scheduledDateTimeActual) : null;
                    let dateB = linkB.scheduledDateTimeActual ? new Date(linkB.scheduledDateTimeActual) : null;
                    if (dateA && isNaN(dateA.getTime())) dateA = null;
                    if (dateB && isNaN(dateB.getTime())) dateB = null;
                    if (dateA && !dateB) return -1; if (!dateA && dateB) return 1;
                    if (dateA && dateB) return dateB.getTime() - dateA.getTime();
                    const displayA = String(linkA.scheduledTimeDisplay || "");
                    const displayB = String(linkB.scheduledTimeDisplay || "");
                    return displayB.localeCompare(displayA);
                }
                default: return 0;
            }
        });
        saveSortCriteriaToLocalStorage();
    } catch (e) {
        console.error("ERROR DURING SORTING OPERATION:", e);
        setStatus(`Error sorting by ${currentSortCriteria}: ${e.message}. List may be unsorted.`);
    }
}

function logToPage(message) {
    if (!clickLogElement) { console.warn("logToPage: clickLogElement not found. Msg:", message); return; }
    try {
        const now = new Date();
        const timestamp = now.toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
        const logEntry = document.createElement('p');
        logEntry.classList.add('log-entry');
        logEntry.textContent = `[${timestamp}] ${message}`;
        if (clickLogElement.firstChild) { clickLogElement.insertBefore(logEntry, clickLogElement.firstChild); }
        else { clickLogElement.appendChild(logEntry); }
    } catch (e) { console.error("Error in logToPage:", e); }
}

// MODIFIED handleRemoveLink with setStatus
function handleRemoveLink(linkToRemove) {
    if (!linkToRemove || typeof linkToRemove.text === 'undefined') {
        setStatus("Error: Remove action called with invalid link data.");
        console.error("handleRemoveLink called with invalid link object:", linkToRemove);
        return;
    }
    setStatus(`Remove button clicked for: "${linkToRemove.text}". Confirming...`);

    if (confirm(`Are you sure you want to remove the link "${linkToRemove.text}"?`)) {
        setStatus(`User confirmed removal for "${linkToRemove.text}". Processing...`);
        const index = links.findIndex(link => link.url === linkToRemove.url && link.text === linkToRemove.text);
        if (index > -1) {
            links.splice(index, 1);
            saveLinksToLocalStorage();
            renderLinks(); // This will re-render the list without the removed item
            logToPage(`Link "${linkToRemove.text}" removed.`);
            setStatus(`Link "${linkToRemove.text}" removed successfully.`);
        } else {
            logToPage(`Error: Could not find link "${linkToRemove.text}" to remove in array.`);
            setStatus(`Error removing "${linkToRemove.text}": not found.`);
            console.error("handleRemoveLink: Link not found. To remove:", linkToRemove, "Current links:", links);
        }
    } else {
        setStatus(`Removal of link "${linkToRemove.text}" cancelled by user.`);
        logToPage(`Removal of link "${linkToRemove.text}" cancelled.`);
    }
}

function makeScheduleEditable(linkObject, displaySpanElement) {
    // ... (same as the version from "Give me the code to latest Script")
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
        }
        if (modifiedInThisEdit) { saveLinksToLocalStorage(); sortLinks(); }
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
    // ... (same as the version from "Give me the code to latest Script")
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
        const visitLaterTimeInput = prompt( `Set/update reminder for "${linkText}":\n(e.g., "2.5 hours from now", or click displayed date for calendar).\nLeave blank to clear.`, currentScheduledTimeForPrompt);
        if (visitLaterTimeInput !== null) {
            const trimmedInput = visitLaterTimeInput.trim();
            if (trimmedInput === "") {
                if (linkObject.scheduledTimeDisplay || linkObject.scheduledDateTimeActual) { delete linkObject.scheduledTimeDisplay; delete linkObject.scheduledDateTimeActual; linksModified = true; }
                detailedReminderMessage += ` Reminder cleared via prompt.`;
            } else {
                const calculatedDate = parseRelativeTimeAndCalcFutureDate(trimmedInput);
                if (calculatedDate) {
                    const newIso = calculatedDate.toISOString();
                    if (linkObject.scheduledDateTimeActual !== newIso || linkObject.scheduledTimeDisplay !== trimmedInput) { linkObject.scheduledDateTimeActual = newIso; linkObject.scheduledTimeDisplay = trimmedInput; linksModified = true; }
                    detailedReminderMessage += ` Reminder set via prompt to: ${new Date(linkObject.scheduledDateTimeActual).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'})} (from input "${trimmedInput}").`;
                } else {
                    if (linkObject.scheduledTimeDisplay !== trimmedInput || linkObject.scheduledDateTimeActual) { linkObject.scheduledTimeDisplay = trimmedInput; delete linkObject.scheduledDateTimeActual; linksModified = true; }
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
    // ... (same as the version from "Give me the code to latest Script")
    if (!linkListElement) { console.error("renderLinks: linkListElement not found."); return; }
    linkListElement.innerHTML = '';
    if (!links || links.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'No links yet. Click "Add New Link" to start!';
        emptyLi.style.justifyContent = 'center'; emptyLi.style.color = '#6c757d';
        linkListElement.appendChild(emptyLi); return;
    }
    links.forEach(linkObj => {
        const listItem = document.createElement('li');
        const linkTextContainer = document.createElement('div'); linkTextContainer.className = 'link-text-container';
        const anchorTag = document.createElement('a'); anchorTag.href = linkObj.url; anchorTag.textContent = linkObj.text;
        anchorTag.title = `Visit ${linkObj.text}`;
        anchorTag.addEventListener('click', (event) => handleLinkClick(event, linkObj));
        linkTextContainer.appendChild(anchorTag); listItem.appendChild(linkTextContainer);

        const scheduleDisplaySpan = document.createElement('span'); scheduleDisplaySpan.className = 'scheduled-time';
        let displayString = ""; let titleHint = "";
        if (linkObj.scheduledDateTimeActual) {
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

// MODIFIED setupAddLinkButtonListener with setStatus
function setupAddLinkButtonListener() {
    setStatus("Attempting to set up 'Add New Link' button listener...");

    if (showAddLinkDialogBtn) {
        showAddLinkDialogBtn.addEventListener('click', () => {
            setStatus("Add New Link button clicked. Prompting for link text...");

            const newLinkText = prompt("Enter the text/name for the new link:");
            if (newLinkText === null) {
                setStatus("Add link cancelled by user (text prompt).");
                logToPage("Add link cancelled by user at text prompt.");
                return;
            }
            if (newLinkText.trim() === "") {
                alert("Link text cannot be empty. Link not added.");
                setStatus("Add link failed: text was empty.");
                logToPage("Add link failed: text was empty.");
                return;
            }
            setStatus("Link text received. Prompting for URL...");

            const newLinkUrl = prompt("Enter the full URL for the new link (e.g., https://www.example.com):");
            if (newLinkUrl === null) {
                setStatus("Add link cancelled by user (URL prompt).");
                logToPage("Add link cancelled by user at URL prompt.");
                return;
            }
            if (newLinkUrl.trim() === "") {
                alert("Link URL cannot be empty. Link not added.");
                setStatus("Add link failed: URL was empty.");
                logToPage("Add link failed: URL was empty.");
                return;
            }
            setStatus("URL received. Processing URL...");

            let cleanUrl = newLinkUrl.trim();
            if (!cleanUrl.toLowerCase().startsWith('http://') && !cleanUrl.toLowerCase().startsWith('https://')) {
                setStatus("URL needs prefix. Confirming with user...");
                if (confirm(`The URL "${cleanUrl}" doesn't start with http:// or https://.\nShould we add "https://"?`)) {
                    cleanUrl = 'https://' + cleanUrl;
                    setStatus("URL prefixed with https://.");
                } else {
                    alert("Invalid URL format. Link not added. Please include http:// or https://.");
                    setStatus("Add link failed: URL format invalid, user declined prefix.");
                    logToPage("Add link failed: URL format invalid by user choice.");
                    return;
                }
            }

            const newLink = {
                text: newLinkText.trim(),
                url: cleanUrl,
                dateAdded: Date.now()
            };
            setStatus("New link object created. Adding to list...");

            links.push(newLink);
            saveLinksToLocalStorage();
            setStatus("Link saved to storage. Sorting links...");
            sortLinks(); // Sort after adding
            setStatus("Links sorted. Rendering updated list...");
            renderLinks();
            logToPage(`New link "${newLink.text}" added.`);
            setStatus("New link added successfully and list updated.");
        });
        setStatus("'Add New Link' button listener attached successfully.");
        console.log("'Add New Link' button listener attached successfully.");
    } else {
        console.error("Add New Link button (showAddLinkDialogBtn) not found during setup.");
        setStatus("CRITICAL ERROR: 'Add New Link' button element ('showAddLinkDialogBtn') not found in HTML. Add feature is disabled. Please check index.html.");
    }
}


// --- Initial Setup (DOMContentLoaded with on-page status updates) ---
document.addEventListener('DOMContentLoaded', () => {
    linkListElement = document.getElementById('linkList');

    setStatus("DOMContentLoaded: Fired. Initializing app...");

    clickLogElement = document.getElementById('clickLog');
    showAddLinkDialogBtn = document.getElementById('showAddLinkDialogBtn');
    sortCriteriaSelect = document.getElementById('sortCriteria');

    if (!linkListElement || !clickLogElement || !showAddLinkDialogBtn || !sortCriteriaSelect) {
        const missing = [];
        if (!linkListElement) missing.push("linkList (UL for links)");
        if (!clickLogElement) missing.push("clickLog (DIV for logs)");
        if (!showAddLinkDialogBtn) missing.push("showAddLinkDialogBtn (Button to add links)");
        if (!sortCriteriaSelect) missing.push("sortCriteria (Dropdown for sorting)");
        const errorMsg = `CRITICAL ERROR: HTML element(s) missing: ${missing.join(', ')}. App cannot run. Verify index.html.`;
        setStatus(errorMsg);
        const errorDiv = document.createElement('div');
        errorDiv.textContent = errorMsg;
        errorDiv.style.color = 'red'; errorDiv.style.fontWeight = 'bold'; errorDiv.style.padding = '20px';
        errorDiv.style.textAlign = 'center'; errorDiv.style.border = '2px solid red'; errorDiv.style.backgroundColor = '#ffe0e0';
        if (document.body) { document.body.prepend(errorDiv); } else { alert(errorMsg); }
        return;
    }
    setStatus("DOM elements selected. Checking Local Storage...");

    if (!isLocalStorageAvailable()) {
        setStatus("Local Storage is not available. Using temporary data (links will not be saved or loaded).");
    } else {
        setStatus("Local Storage available. Loading links...");
    }

    links = loadLinksFromLocalStorage();
    setStatus(`Links loaded/defaulted (${links.length} found). Loading sort criteria...`);

    currentSortCriteria = loadSortCriteriaFromLocalStorage();
    setStatus(`Sort criteria loaded ('${currentSortCriteria}'). Sorting links...`);

    sortLinks(); // This is where it was getting stuck
    setStatus("Links sorted. Rendering main list..."); // This message indicates sortLinks() completed

    renderLinks();

    if (linkListElement && linkListElement.firstChild && linkListElement.firstChild.textContent &&
        linkListElement.firstChild.textContent.startsWith("Status: Rendering main list...")) {
        // This implies renderLinks didn't clear the status, or list is empty.
        // If links array is empty, renderLinks shows "No links yet..."
        // So this check is more for "did renderLinks execute and clear the status?"
        console.warn("renderLinks completed, but status message might still be visible if list was empty or error in renderLinks itself.");
    }

    setupAddLinkButtonListener();
    logToPage("Link manager initialized. Current time: " + new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }));
    console.log("DOMContentLoaded: Initialization complete.");
});
