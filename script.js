// script.js (Complete, Updated, and More Robust Version)

// --- Configuration & Global Variables ---
const LOCAL_STORAGE_KEY_LINKS = 'interactiveLinkManagerData_v2'; // Changed key to help start fresh if needed
const LOCAL_STORAGE_KEY_SORT = 'interactiveLinkManagerSortCriteria_v2'; // Changed key
let links = []; // Holds the array of link objects
let currentSortCriteria = 'dateAdded_desc'; // Default sort order

// DOM element variables - will be assigned in DOMContentLoaded
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
            linkListElement.innerHTML = ''; // Clear previous content
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
    // console.log(`Could not parse relative time: "${inputString}"`);
    return null;
}

function getLocalDateTimePickerValue(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
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

// More robust loadLinksFromLocalStorage
function loadLinksFromLocalStorage() {
    console.log("Attempting to load links from Local Storage. Key:", LOCAL_STORAGE_KEY_LINKS);
    if (!isLocalStorageAvailable()) { // Check added here too
        console.warn("Local Storage not available during load. Using defaults.");
        return getDefaultLinks();
    }
    try {
        const storedLinks = localStorage.getItem(LOCAL_STORAGE_KEY_LINKS);
        if (storedLinks) {
            let parsedLinks = JSON.parse(storedLinks);
            if (Array.isArray(parsedLinks)) {
                parsedLinks = parsedLinks.map(link => {
                    // Ensure essential properties exist and have a default type
                    const migratedLink = {
                        text: typeof link.text === 'string' ? link.text : "Untitled Link",
                        url: typeof link.url === 'string' ? link.url : "#",
                        ...link, // Spread other existing properties like scheduledDateTimeActual
                        dateAdded: link.dateAdded === undefined ? 0 : Number(link.dateAdded) || 0,
                        scheduledTimeDisplay: typeof link.scheduledTimeDisplay === 'string' ? link.scheduledTimeDisplay : "",
                        scheduledDateTimeActual: typeof link.scheduledDateTimeActual === 'string' ? link.scheduledDateTimeActual : null
                    };

                    // One-time migration from old `scheduledTime` property
                    if (migratedLink.hasOwnProperty('scheduledTime')) {
                        if (typeof migratedLink.scheduledTime === 'string' && migratedLink.scheduledTime.trim() !== "" && !migratedLink.scheduledDateTimeActual) {
                            if (!migratedLink.scheduledTimeDisplay) { // If display is empty, populate from old field
                                migratedLink.scheduledTimeDisplay = migratedLink.scheduledTime;
                            }
                            const calculatedDate = parseRelativeTimeAndCalcFutureDate(migratedLink.scheduledTime);
                            if (calculatedDate) {
                                migratedLink.scheduledDateTimeActual = calculatedDate.toISOString();
                            }
                        } else if (typeof migratedLink.scheduledTime === 'string' && !migratedLink.scheduledTimeDisplay) {
                            migratedLink.scheduledTimeDisplay = migratedLink.scheduledTime; // Preserve if it was just an empty/non-parsable string
                        }
                        delete migratedLink.scheduledTime; // Clean up old field
                    }
                    
                    // Validate scheduledDateTimeActual - if it's there, it must be a valid ISO string parsable to a date
                    if (migratedLink.scheduledDateTimeActual) {
                        if (isNaN(new Date(migratedLink.scheduledDateTimeActual).getTime())) {
                            console.warn("Invalid scheduledDateTimeActual found in localStorage, clearing for link:", migratedLink.text);
                            migratedLink.scheduledDateTimeActual = null;
                        }
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
        // Optionally clear corrupted storage:
        // try { localStorage.removeItem(LOCAL_STORAGE_KEY_LINKS); console.log("Attempted to clear corrupted links storage."); } catch (e2) {}
    }
    return getDefaultLinks();
}

function loadSortCriteriaFromLocalStorage() {
    if (!isLocalStorageAvailable()) {
        console.warn("Local Storage not available for loading sort criteria.");
        return currentSortCriteria; // Return default
    }
    const storedSortCriteria = localStorage.getItem(LOCAL_STORAGE_KEY_SORT);
    if (storedSortCriteria) {
        console.log("Loaded sort criteria from Local Storage:", storedSortCriteria);
        return storedSortCriteria;
    }
    console.log("No sort criteria in Local Storage, using default:", currentSortCriteria);
    return currentSortCriteria;
}

// More robust sortLinks function
function sortLinks() {
    setStatus(`Attempting to sort links by: ${currentSortCriteria}... (Processing ${links.length} links)`);
    try {
        links.sort((a, b) => {
            // Default to empty objects if a or b are not objects (highly defensive)
            const linkA = (typeof a === 'object' && a !== null) ? a : {};
            const linkB = (typeof b === 'object' && b !== null) ? b : {};

            switch (currentSortCriteria) {
                case 'dateAdded_desc':
                    return (Number(linkB.dateAdded) || 0) - (Number(linkA.dateAdded) || 0);
                case 'dateAdded_asc':
                    return (Number(linkA.dateAdded) || 0) - (Number(linkB.dateAdded) || 0);
                case 'text_asc':
                    return (String(linkA.text || "")).localeCompare(String(linkB.text || ""));
                case 'text_desc':
                    return (String(linkB.text || "")).localeCompare(String(linkA.text || ""));
                case 'scheduledTime_asc': {
                    let dateA = linkA.scheduledDateTimeActual ? new Date(linkA.scheduledDateTimeActual) : null;
                    let dateB = linkB.scheduledDateTimeActual ? new Date(linkB.scheduledDateTimeActual) : null;

                    if (dateA && isNaN(dateA.getTime())) dateA = null;
                    if (dateB && isNaN(dateB.getTime())) dateB = null;

                    if (dateA && !dateB) return -1;
                    if (!dateA && dateB) return 1;
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

                    if (dateA && !dateB) return -1;
                    if (!dateA && dateB) return 1;
                    if (dateA && dateB) return dateB.getTime() - dateA.getTime();

                    const displayA = String(linkA.scheduledTimeDisplay || "");
                    const displayB = String(linkB.scheduledTimeDisplay || "");
                    return displayB.localeCompare(displayA);
                }
                default:
                    return 0;
            }
        });
        if (isLocalStorageAvailable()) {
            saveSortCriteriaToLocalStorage();
        }
    } catch (e) {
        console.error("ERROR DURING SORTING OPERATION:", e);
        setStatus(`Error during sorting links by ${currentSortCriteria}: ${e.message}. List may not be sorted correctly.`);
        // To prevent further issues, maybe don't save sort criteria if sort failed
    }
}

function logToPage(message) {
    if (!clickLogElement) {
        console.warn("logToPage: clickLogElement not found. Message:", message);
        return;
    }
    try {
        const now = new Date();
        const timestamp = now.toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
        const logEntry = document.createElement('p');
        logEntry.classList.add('log-entry');
        logEntry.textContent = `[${timestamp}] ${message}`;
        if (clickLogElement.firstChild) {
            clickLogElement.insertBefore(logEntry, clickLogElement.firstChild);
        } else {
            clickLogElement.appendChild(logEntry);
        }
    } catch (e) {
        console.error("Error in logToPage:", e);
    }
}

function handleRemoveLink(linkToRemove) {
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
        const visitLaterTimeInput = prompt(
            `Set/update reminder for "${linkText}":\n(e.g., "2.5 hours from now", or click displayed date for calendar).\nLeave blank to clear.`,
            currentScheduledTimeForPrompt
        );

        if (visitLaterTimeInput !== null) {
            const trimmedInput = visitLaterTimeInput.trim();
            if (trimmedInput === "") {
                if (linkObject.scheduledTimeDisplay || linkObject.scheduledDateTimeActual) {
                    delete linkObject.scheduledTimeDisplay; delete linkObject.scheduledDateTimeActual; linksModified = true;
                }
                detailedReminderMessage += ` Reminder cleared via prompt.`;
            } else {
                const calculatedDate = parseRelativeTimeAndCalcFutureDate(trimmedInput);
                if (calculatedDate) {
                    const newIso = calculatedDate.toISOString();
                    if (linkObject.scheduledDateTimeActual !== newIso || linkObject.scheduledTimeDisplay !== trimmedInput) {
                        linkObject.scheduledDateTimeActual = newIso; linkObject.scheduledTimeDisplay = trimmedInput; linksModified = true;
                    }
                    detailedReminderMessage += ` Reminder set via prompt to: ${new Date(linkObject.scheduledDateTimeActual).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'})} (from input "${trimmedInput}").`;
                } else {
                    if (linkObject.scheduledTimeDisplay !== trimmedInput || linkObject.scheduledDateTimeActual) {
                        linkObject.scheduledTimeDisplay = trimmedInput; delete linkObject.scheduledDateTimeActual; linksModified = true;
                    }
                    detailedReminderMessage += ` Reminder text set via prompt to: "${trimmedInput}" (not a parseable relative time).`;
                }
            }
        } else { detailedReminderMessage += ` User declined to update reminder via prompt.`; }

        logToPage(baseActivityMessage + detailedReminderMessage);
        if (linksModified) { saveLinksToLocalStorage(); sortLinks(); } // sortLinks here if data affecting sort changed
        renderLinks();
    }
}

function renderLinks() {
    if (!linkListElement) { console.error("renderLinks: linkListElement not found."); return; }
    linkListElement.innerHTML = '';
    if (!links || links.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'No links yet. Click "Add New Link" to start!';
        emptyLi.style.justifyContent = 'center'; emptyLi.style.color = '#6c757d'; // For single centered message
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

function setupAddLinkButtonListener() {
    if (showAddLinkDialogBtn) {
        showAddLinkDialogBtn.addEventListener('click', () => {
            const newLinkText = prompt("Link text:"); if (newLinkText === null || !newLinkText.trim()) { alert("Text is required."); return; }
            const newLinkUrl = prompt("Link URL (e.g., https://example.com):"); if (newLinkUrl === null || !newLinkUrl.trim()) { alert("URL is required."); return; }
            let cleanUrl = newLinkUrl.trim();
            if (!cleanUrl.toLowerCase().startsWith('http://') && !cleanUrl.toLowerCase().startsWith('https://')) {
                if (confirm(`URL "${cleanUrl}" might be invalid (missing http:// or https://).\nAdd "https://"?`)) {
                    cleanUrl = 'https://' + cleanUrl;
                } else { alert("Link not added. Please ensure URL starts with http:// or https://."); return; }
            }
            const newLink = { text: newLinkText.trim(), url: cleanUrl, dateAdded: Date.now() };
            links.push(newLink); saveLinksToLocalStorage(); sortLinks(); renderLinks(); logToPage(`Link "${newLink.text}" added.`);
        });
    } else { console.error("Add New Link button not found during setup."); }
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
        if (!linkListElement) missing.push("linkList");
        if (!clickLogElement) missing.push("clickLog");
        if (!showAddLinkDialogBtn) missing.push("showAddLinkDialogBtn");
        if (!sortCriteriaSelect) missing.push("sortCriteria");
        const errorMsg = `CRITICAL ERROR: HTML element(s) missing: ${missing.join(', ')}. App cannot run. Verify index.html.`;
        setStatus(errorMsg); // Update status area
        const errorDiv = document.createElement('div'); // Prominent page error
        errorDiv.textContent = errorMsg;
        errorDiv.style.color = 'red'; errorDiv.style.fontWeight = 'bold'; errorDiv.style.padding = '20px';
        errorDiv.style.textAlign = 'center'; errorDiv.style.border = '2px solid red'; errorDiv.style.backgroundColor = '#ffe0e0';
        if (document.body) { document.body.prepend(errorDiv); } else { alert(errorMsg); }
        return;
    }
    setStatus("DOM elements selected. Checking Local Storage...");

    if (!isLocalStorageAvailable()) {
        setStatus("Local Storage is not available. Using temporary data (links will not be saved/loaded).");
    } else {
        setStatus("Local Storage available. Loading links...");
    }

    links = loadLinksFromLocalStorage();
    setStatus(`Links loaded/defaulted (${links.length} found). Loading sort criteria...`);

    currentSortCriteria = loadSortCriteriaFromLocalStorage();
    setStatus(`Sort criteria loaded ('${currentSortCriteria}'). Sorting links...`);

    sortLinks(); // This is the function we suspect might have issues
    // The setStatus call *after* this will indicate if sortLinks completed without error.
    setStatus("Links sorted. Rendering main list...");

    renderLinks();

    if (linkListElement && linkListElement.firstChild && linkListElement.firstChild.textContent &&
        linkListElement.firstChild.textContent.startsWith("Status: Rendering main list...")) {
        setStatus("Warning: renderLinks may not have fully populated the list or an error occurred within renderLinks. Check console if available.");
    }

    setupAddLinkButtonListener();
    // Final log to page; setStatus might be overwritten if linkList IS the clickLog.
    // For clarity, perhaps the last setStatus should be different or conditional.
    // For now, this is okay. If it reaches here, most things worked.
    if (!(linkListElement && linkListElement.firstChild && linkListElement.firstChild.textContent &&
        linkListElement.firstChild.textContent.startsWith("Status:"))) {
        // Only log this if not showing a status message already (i.e. renderLinks worked)
        logToPage("Link manager initialized successfully.");
    }
    console.log("DOMContentLoaded: Initialization complete.");
});
