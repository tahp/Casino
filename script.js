// script.js

// --- Configuration & Global Variables ---
const LOCAL_STORAGE_KEY_LINKS = 'interactiveLinkManagerData';
const LOCAL_STORAGE_KEY_SORT = 'interactiveLinkManagerSortCriteria';
let links = []; // Holds the array of link objects
let currentSortCriteria = 'dateAdded_desc'; // Default sort order

// DOM element variables - will be assigned in DOMContentLoaded
let linkListElement;
let clickLogElement;
let showAddLinkDialogBtn;
let sortCriteriaSelect;

// --- Core Functions ---

/**
 * Parses a relative time string and returns a Date object if successful.
 * Supports units: hours (hr), minutes (min), days.
 * Examples: "10 hours from now", "1.5 days later", "30 min hence"
 */
function parseRelativeTimeAndCalcFutureDate(inputString) {
    if (!inputString) return null;

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
    console.log(`Could not parse relative time: "${inputString}"`);
    return null;
}

/**
 * Converts an ISO string (UTC) to the 'YYYY-MM-DDTHH:MM' format
 * required by <input type="datetime-local">, adjusted for the local timezone.
 */
function getLocalDateTimePickerValue(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return localDate.toISOString().slice(0, 16);
    } catch (e) {
        console.error("Error converting ISO to datetime-local value:", e);
        return '';
    }
}

/**
 * Converts a 'YYYY-MM-DDTHH:MM' string from <input type="datetime-local">
 * (which is local time) back to a UTC ISO string for storage.
 */
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


// --- Local Storage Functions ---
function saveLinksToLocalStorage() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY_LINKS, JSON.stringify(links));
    } catch (e) {
        console.error("Could not save links to Local Storage:", e);
    }
}

function saveSortCriteriaToLocalStorage() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY_SORT, currentSortCriteria);
    } catch (e) {
        console.error("Could not save sort criteria to Local Storage:", e);
    }
}

function getDefaultLinks() {
    const now = Date.now();
    console.log("Using default links.");
    return [
        {
            text: "Google Search (Default)",
            url: "https://www.google.com",
            scheduledTimeDisplay: "Tomorrow AM",
            dateAdded: now - 200000
        },
        {
            text: "Wikipedia (Default)",
            url: "https://www.wikipedia.org",
            dateAdded: now - 100000
        },
        {
            text: "Developer Mozilla (Default)",
            url: "https://developer.mozilla.org",
            dateAdded: now
        }
    ];
}

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
                    if (migratedLink.scheduledTime && migratedLink.scheduledDateTimeActual === undefined) {
                        migratedLink.scheduledTimeDisplay = migratedLink.scheduledTime;
                        const calculatedDate = parseRelativeTimeAndCalcFutureDate(migratedLink.scheduledTime);
                        if (calculatedDate) {
                            migratedLink.scheduledDateTimeActual = calculatedDate.toISOString();
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
    }
    return getDefaultLinks();
}

function loadSortCriteriaFromLocalStorage() {
    const storedSortCriteria = localStorage.getItem(LOCAL_STORAGE_KEY_SORT);
    if (storedSortCriteria) {
        return storedSortCriteria;
    }
    return currentSortCriteria;
}

// --- Sorting Function ---
function sortLinks() {
    console.log("Sorting links by:", currentSortCriteria);
    links.sort((a, b) => {
        switch (currentSortCriteria) {
            case 'dateAdded_desc':
                return (b.dateAdded || 0) - (a.dateAdded || 0);
            case 'dateAdded_asc':
                return (a.dateAdded || 0) - (b.dateAdded || 0);
            case 'text_asc':
                return a.text.localeCompare(b.text);
            case 'text_desc':
                return b.text.localeCompare(a.text);
            case 'scheduledTime_asc':
                if (a.scheduledDateTimeActual && !b.scheduledDateTimeActual) return -1;
                if (!a.scheduledDateTimeActual && b.scheduledDateTimeActual) return 1;
                if (a.scheduledDateTimeActual && b.scheduledDateTimeActual) {
                    return new Date(a.scheduledDateTimeActual) - new Date(b.scheduledDateTimeActual);
                }
                if (a.scheduledTimeDisplay && !b.scheduledTimeDisplay) return -1;
                if (!a.scheduledTimeDisplay && b.scheduledTimeDisplay) return 1;
                if (a.scheduledTimeDisplay && b.scheduledTimeDisplay) {
                    return a.scheduledTimeDisplay.localeCompare(b.scheduledTimeDisplay);
                }
                return 0;
            case 'scheduledTime_desc':
                if (a.scheduledDateTimeActual && !b.scheduledDateTimeActual) return -1;
                if (!a.scheduledDateTimeActual && b.scheduledDateTimeActual) return 1;
                if (a.scheduledDateTimeActual && b.scheduledDateTimeActual) {
                    return new Date(b.scheduledDateTimeActual) - new Date(a.scheduledDateTimeActual);
                }
                if (a.scheduledTimeDisplay && !b.scheduledTimeDisplay) return -1;
                if (!a.scheduledTimeDisplay && b.scheduledTimeDisplay) return 1;
                if (a.scheduledTimeDisplay && b.scheduledTimeDisplay) {
                    return b.scheduledTimeDisplay.localeCompare(a.scheduledTimeDisplay);
                }
                return 0;
            default:
                return 0;
        }
    });
    saveSortCriteriaToLocalStorage();
}

// --- UI Helper Functions ---
function logToPage(message) {
    const now = new Date();
    const timestamp = now.toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
    const logEntry = document.createElement('p');
    logEntry.classList.add('log-entry');
    logEntry.textContent = `[${timestamp}] ${message}`;
    if (clickLogElement && clickLogElement.firstChild) {
        clickLogElement.insertBefore(logEntry, clickLogElement.firstChild);
    } else if (clickLogElement) {
        clickLogElement.appendChild(logEntry);
    }
}

// --- DOM Manipulation & Event Handlers ---
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

    let hasBeenFinalized = false; // Prevent multiple finalizations

    const finalizeEdit = (saveChanges) => {
        if (hasBeenFinalized) return;
        hasBeenFinalized = true;

        if (input.parentNode) { // Remove input if it's still in DOM
            input.parentNode.removeChild(input);
        }

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
                } else { // Invalid date entered into picker
                    linkObject.scheduledDateTimeActual = originalDateTimeActual; // Revert
                    linkObject.scheduledTimeDisplay = originalTimeDisplay;
                    logToPage(`Invalid date from calendar for "${linkObject.text}". Change reverted.`);
                }
            } else { // Input was cleared
                if (linkObject.scheduledDateTimeActual || linkObject.scheduledTimeDisplay) {
                    delete linkObject.scheduledDateTimeActual;
                    delete linkObject.scheduledTimeDisplay;
                    modifiedInThisEdit = true;
                    logToPage(`Reminder for "${linkObject.text}" cleared via calendar.`);
                }
            }
        } else { // Cancelled
            linkObject.scheduledDateTimeActual = originalDateTimeActual;
            linkObject.scheduledTimeDisplay = originalTimeDisplay;
            logToPage(`Calendar edit for "${linkObject.text}" cancelled.`);
        }

        if (modifiedInThisEdit) {
            saveLinksToLocalStorage();
            sortLinks();
        }
        renderLinks(); // Always re-render
    };

    input.addEventListener('blur', () => {
        // Finalize on blur only if not already finalized by Enter/Escape
        if (!hasBeenFinalized) {
            finalizeEdit(true); // Assume blur means accept changes
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finalizeEdit(true);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            finalizeEdit(false);
        }
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
            `Set/update reminder for "${linkText}":\n(e.g., "2.5 hours from now", or click the displayed date for a calendar).\nLeave blank to clear reminder.`,
            currentScheduledTimeForPrompt
        );

        if (visitLaterTimeInput !== null) {
            const trimmedInput = visitLaterTimeInput.trim();
            if (trimmedInput === "") {
                if (linkObject.scheduledTimeDisplay || linkObject.scheduledDateTimeActual) {
                    delete linkObject.scheduledTimeDisplay;
                    delete linkObject.scheduledDateTimeActual;
                    linksModified = true;
                }
                detailedReminderMessage += ` Reminder cleared via prompt.`;
            } else {
                const calculatedDate = parseRelativeTimeAndCalcFutureDate(trimmedInput);
                if (calculatedDate) {
                    const newIso = calculatedDate.toISOString();
                    if (linkObject.scheduledDateTimeActual !== newIso || linkObject.scheduledTimeDisplay !== trimmedInput) {
                        linkObject.scheduledDateTimeActual = newIso;
                        linkObject.scheduledTimeDisplay = trimmedInput;
                        linksModified = true;
                    }
                    detailedReminderMessage += ` Reminder set via prompt to: ${new Date(linkObject.scheduledDateTimeActual).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} (from input "${trimmedInput}").`;
                } else {
                    if (linkObject.scheduledTimeDisplay !== trimmedInput || linkObject.scheduledDateTimeActual) {
                        linkObject.scheduledTimeDisplay = trimmedInput;
                        delete linkObject.scheduledDateTimeActual;
                        linksModified = true;
                    }
                    detailedReminderMessage += ` Reminder text set via prompt to: "${trimmedInput}" (not a parseable relative time).`;
                }
            }
        } else {
            detailedReminderMessage += ` User declined to update reminder via prompt.`;
        }

        logToPage(baseActivityMessage + detailedReminderMessage);
        if (linksModified) {
            saveLinksToLocalStorage();
            sortLinks();
        }
        renderLinks();
    }
}

function renderLinks() {
    if (!linkListElement) {
        console.error("renderLinks called before linkListElement is defined.");
        return;
    }
    linkListElement.innerHTML = '';

    if (!links || links.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'No links have been added yet. Click "Add New Link" below!';
        emptyLi.style.justifyContent = 'center';
        emptyLi.style.color = '#6c757d';
        linkListElement.appendChild(emptyLi);
        return;
    }

    links.forEach(linkObj => {
        const listItem = document.createElement('li');
        const linkTextContainer = document.createElement('div');
        linkTextContainer.className = 'link-text-container';
        const anchorTag = document.createElement('a');
        anchorTag.href = linkObj.url;
        anchorTag.textContent = linkObj.text;
        anchorTag.title = `Visit ${linkObj.text}`;
        anchorTag.addEventListener('click', (event) => handleLinkClick(event, linkObj));
        linkTextContainer.appendChild(anchorTag);
        listItem.appendChild(linkTextContainer);

        const scheduleDisplaySpan = document.createElement('span');
        scheduleDisplaySpan.className = 'scheduled-time'; // Base class for styling
        let displayString = "";
        let titleHint = "";

        if (linkObj.scheduledDateTimeActual) {
            displayString = `Visit: ${new Date(linkObj.scheduledDateTimeActual).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
            if (linkObj.scheduledTimeDisplay && parseRelativeTimeAndCalcFutureDate(linkObj.scheduledTimeDisplay)) { // Check if original was successfully parsed relative time
                titleHint = `Original input: "${linkObj.scheduledTimeDisplay}"`;
            } else if (linkObj.scheduledTimeDisplay) { // If there's a display string that wasn't a parsable relative one
                titleHint = `Set as: "${linkObj.scheduledTimeDisplay}"`;
            }
        } else if (linkObj.scheduledTimeDisplay) {
            displayString = `Visit: ${linkObj.scheduledTimeDisplay}`;
        } else {
            displayString = "Set Reminder";
            scheduleDisplaySpan.style.opacity = "0.6";
            scheduleDisplaySpan.style.fontStyle = "italic";
        }

        scheduleDisplaySpan.textContent = displayString;
        if (titleHint) {
            scheduleDisplaySpan.title = titleHint;
        }
        scheduleDisplaySpan.style.cursor = 'pointer';
        scheduleDisplaySpan.addEventListener('click', (e) => {
            e.stopPropagation();
            makeScheduleEditable(linkObj, scheduleDisplaySpan);
        });
        listItem.appendChild(scheduleDisplaySpan);

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'remove-btn';
        removeButton.title = `Remove link: ${linkObj.text}`;
        removeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            handleRemoveLink(linkObj);
        });
        listItem.appendChild(removeButton);

        linkListElement.appendChild(listItem);
    });
}

function setupAddLinkButtonListener() {
    if (showAddLinkDialogBtn) {
        showAddLinkDialogBtn.addEventListener('click', () => {
            const newLinkText = prompt("Enter the text/name for the new link:");
            if (newLinkText === null) return;
            if (newLinkText.trim() === "") {
                alert("Link text cannot be empty."); return;
            }

            const newLinkUrl = prompt("Enter the full URL (e.g., https://www.example.com):");
            if (newLinkUrl === null) return;
            if (newLinkUrl.trim() === "") {
                alert("Link URL cannot be empty."); return;
            }

            let cleanUrl = newLinkUrl.trim();
            if (!cleanUrl.toLowerCase().startsWith('http://') && !cleanUrl.toLowerCase().startsWith('https://')) {
                if (confirm(`URL "${cleanUrl}" might be invalid (missing http:// or https://).\nAdd "https://"?`)) {
                    cleanUrl = 'https://' + cleanUrl;
                } else {
                    alert("Link not added. Please ensure URL starts with http:// or https://."); return;
                }
            }

            const newLink = {
                text: newLinkText.trim(),
                url: cleanUrl,
                dateAdded: Date.now()
            };
            links.push(newLink);
            saveLinksToLocalStorage();
            sortLinks();
            renderLinks();
            logToPage(`New link "${newLink.text}" added.`);
        });
    } else {
        console.error("Add New Link button not found during setup.");
    }
}

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    linkListElement = document.getElementById('linkList');
    clickLogElement = document.getElementById('clickLog');
    showAddLinkDialogBtn = document.getElementById('showAddLinkDialogBtn');
    sortCriteriaSelect = document.getElementById('sortCriteria');

    if (!linkListElement || !clickLogElement || !showAddLinkDialogBtn || !sortCriteriaSelect) {
        console.error("One or more critical DOM elements could not be found.");
        const errorDiv = document.createElement('div');
        errorDiv.textContent = "Error: Page elements missing. App may not function.";
        errorDiv.style.color = 'red';
        errorDiv.style.fontWeight = 'bold';
        errorDiv.style.padding = '20px';
        errorDiv.style.textAlign = 'center';
        document.body.prepend(errorDiv);
        return;
    }

    console.log("DOMContentLoaded: Event fired. DOM elements selected.");

    links = loadLinksFromLocalStorage();
    currentSortCriteria = loadSortCriteriaFromLocalStorage();

    if (sortCriteriaSelect) {
        sortCriteriaSelect.value = currentSortCriteria;
        sortCriteriaSelect.addEventListener('change', (event) => {
            currentSortCriteria = event.target.value;
            sortLinks();
            renderLinks();
        });
    }

    sortLinks();
    renderLinks();
    setupAddLinkButtonListener();

    logToPage("Link manager initialized. Current time: " + new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }));
    console.log("DOMContentLoaded: Initialization complete. Initial links:", JSON.parse(JSON.stringify(links)));
});
