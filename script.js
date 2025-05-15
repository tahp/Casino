// At the very top of the script
const LOCAL_STORAGE_KEY_LINKS = 'interactiveLinkManagerData';
const LOCAL_STORAGE_KEY_SORT = 'interactiveLinkManagerSortCriteria';
let links = [];
let currentSortCriteria = 'dateAdded_desc';

// DOM element variables
let linkListElement;
let clickLogElement;
let showAddLinkDialogBtn;
let sortCriteriaSelect;

// --- NEW: Function to Parse Relative Time String ---
/**
 * Parses a relative time string (e.g., "18.5 hours from now") and returns a Date object.
 * Returns null if the string cannot be parsed.
 * Supports units: hours (hr), minutes (min), days.
 */
function parseRelativeTimeAndCalcFutureDate(inputString) {
    if (!inputString) return null;

    const cleanedInput = inputString.toLowerCase().trim();
    // Regex: captures value, unit (hour/hr, minute/min, day), and suffix (from now, later, hence)
    // Allows decimal for value.
    const regex = /^(\d+(\.\d+)?)\s+(hour|hr|minute|min|day)s?\s+(?:from\s+now|later|hence)$/i;
    const match = cleanedInput.match(regex);

    if (match) {
        const value = parseFloat(match[1]);
        let unit = match[3];

        // Normalize unit
        if (unit === 'hr') unit = 'hour';
        if (unit === 'min') unit = 'minute';

        let futureDate = new Date(); // Start with current date/time

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
                return null; // Should not be reached if regex is correct
        }
        console.log(`Parsed "${inputString}" to: ${futureDate.toISOString()}`);
        return futureDate;
    }
    console.log(`Could not parse relative time: "${inputString}"`);
    return null; // No match
}


// --- Local Storage Functions (saveSortCriteriaToLocalStorage is new) ---
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
    return [
        // Ensure default links also have a dateAdded timestamp
        // And updated scheduledTime structure if applicable
        {
            text: "Google Search (Default)",
            url: "https://www.google.com",
            scheduledTimeDisplay: "Tomorrow AM", // User-friendly display
            // scheduledDateTimeActual: null, // No actual calculation for this default string yet
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
                // Data migration/ensure properties
                parsedLinks = parsedLinks.map(link => {
                    const migratedLink = {
                        ...link,
                        dateAdded: link.dateAdded === undefined ? 0 : link.dateAdded
                    };
                    // If old link only has 'scheduledTime' (the simple string),
                    // move it to 'scheduledTimeDisplay' and try to parse it.
                    if (migratedLink.scheduledTime && migratedLink.scheduledDateTimeActual === undefined) {
                        migratedLink.scheduledTimeDisplay = migratedLink.scheduledTime;
                        const calculatedDate = parseRelativeTimeAndCalcFutureDate(migratedLink.scheduledTime);
                        if (calculatedDate) {
                            migratedLink.scheduledDateTimeActual = calculatedDate.toISOString();
                        }
                        delete migratedLink.scheduledTime; // Clean up old field
                    }
                    return migratedLink;
                });
                console.log("Parsed links from Local Storage:", parsedLinks);
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
    return currentSortCriteria; // Default if nothing is stored
}


// --- Sorting Function (Updated for scheduledDateTimeActual) ---
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
            case 'scheduledTime_asc': // Sort by actual calculated date if available
                if (a.scheduledDateTimeActual && !b.scheduledDateTimeActual) return -1; // a has date, b does not
                if (!a.scheduledDateTimeActual && b.scheduledDateTimeActual) return 1;  // b has date, a does not
                if (a.scheduledDateTimeActual && b.scheduledDateTimeActual) {
                    return new Date(a.scheduledDateTimeActual) - new Date(b.scheduledDateTimeActual);
                }
                // Fallback: if no actual dates, compare by display string (or treat as equal if no display string)
                return (a.scheduledTimeDisplay || "").localeCompare(b.scheduledTimeDisplay || "");
            case 'scheduledTime_desc':
                if (a.scheduledDateTimeActual && !b.scheduledDateTimeActual) return -1; // a has date, b does not (still want a first if b is "less" for desc)
                if (!a.scheduledDateTimeActual && b.scheduledDateTimeActual) return 1;
                if (a.scheduledDateTimeActual && b.scheduledDateTimeActual) {
                    return new Date(b.scheduledDateTimeActual) - new Date(a.scheduledDateTimeActual);
                }
                return (b.scheduledTimeDisplay || "").localeCompare(a.scheduledTimeDisplay || "");
            default:
                return 0;
        }
    });
    saveSortCriteriaToLocalStorage();
}

// --- Helper function to log messages to the page (no changes) ---
function logToPage(message) {
    const now = new Date();
    const timestamp = now.toLocaleString();
    const logEntry = document.createElement('p');
    logEntry.classList.add('log-entry');
    logEntry.textContent = `[${timestamp}] ${message}`;
    if (clickLogElement && clickLogElement.firstChild) {
        clickLogElement.insertBefore(logEntry, clickLogElement.firstChild);
    } else if (clickLogElement) {
        clickLogElement.appendChild(logEntry);
    }
}

// --- Function to handle link removal (no functional change, saveLinksToLocalStorage is already there) ---
function handleRemoveLink(linkToRemove) {
    if (confirm(`Are you sure you want to remove the link "${linkToRemove.text}"? This cannot be undone.`)) {
        const index = links.findIndex(link => link.url === linkToRemove.url && link.text === linkToRemove.text);
        if (index > -1) {
            links.splice(index, 1);
            saveLinksToLocalStorage();
            renderLinks(); // Re-render (will use current sort)
            logToPage(`Link "${linkToRemove.text}" removed.`);
        } else {
            logToPage(`Error: Could not find link "${linkToRemove.text}" in the array to remove.`);
        }
    }
}

// --- Function to handle link clicks (Updated to use new parsing) ---
function handleLinkClick(event, linkObject) {
    event.preventDefault();
    const url = linkObject.url;
    const linkText = linkObject.text;
    let activityMessage = `Clicked "${linkText}" (${url}).`;
    let linksModified = false;

    if (confirm(`You clicked on "${linkText}".\nDo you want to visit ${url} now?`)) {
        activityMessage += ` User chose to visit immediately. Navigating...`;
        logToPage(activityMessage);
        window.location.href = url;
    } else {
        activityMessage += ` User chose NOT to visit immediately.`;
        const currentScheduledTimeDisplay = linkObject.scheduledDateTimeActual ?
            (linkObject.scheduledTimeDisplay || new Date(linkObject.scheduledDateTimeActual).toLocaleString()) :
            (linkObject.scheduledTimeDisplay || "");

        const visitLaterTimeInput = prompt(
            `Set/update reminder for "${linkText}":\n(e.g., "18.5 hours from now", "2 days later", or a specific date/time like "May 16, 10:00 AM").\nLeave blank to clear.`,
            currentScheduledTimeDisplay // Pre-fill with existing user-friendly display
        );

        if (visitLaterTimeInput !== null) { // User clicked OK (input can be empty string)
            const trimmedInput = visitLaterTimeInput.trim();
            if (trimmedInput === "") { // User explicitly cleared the input
                if (linkObject.scheduledTimeDisplay || linkObject.scheduledDateTimeActual) {
                    delete linkObject.scheduledTimeDisplay;
                    delete linkObject.scheduledDateTimeActual;
                    linksModified = true;
                }
                activityMessage += ` Reminder cleared.`;
            } else {
                const calculatedDate = parseRelativeTimeAndCalcFutureDate(trimmedInput);
                if (calculatedDate) {
                    linkObject.scheduledDateTimeActual = calculatedDate.toISOString();
                    linkObject.scheduledTimeDisplay = trimmedInput; // Store original input
                    linksModified = true;
                    activityMessage += ` Reminder set to: ${new Date(linkObject.scheduledDateTimeActual).toLocaleString()} (from input "${trimmedInput}").`;
                } else {
                    // If parsing as relative time fails, store the input as a general display string
                    // And clear any previously calculated actual date if the new input isn't parsable
                    linkObject.scheduledTimeDisplay = trimmedInput;
                    delete linkObject.scheduledDateTimeActual; // No longer a valid calculated date
                    linksModified = true;
                    activityMessage += ` Reminder text set to: "${trimmedInput}" (Note: could not parse as relative time, will sort alphabetically).`;
                }
            }
        } else { // User pressed cancel
            activityMessage += ` User declined to set/update a reminder.`;
        }

        if (linksModified) {
            saveLinksToLocalStorage();
        }
        logToPage(activityMessage);
        sortLinks(); // Re-sort if scheduled time changed
        renderLinks();
    }
}

// --- Function to render the links on the page (Updated display logic) ---
function renderLinks() {
    if (!linkListElement) return;
    linkListElement.innerHTML = '';

    if (!links || links.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'No links have been added yet. Click "Add New Link" below!';
        emptyLi.style.justifyContent = 'center';
        emptyLi.style.color = '#6c757d';
        linkListElement.appendChild(emptyLi);
        return;
    }

    links.forEach(linkObj => { // Assumes links array is already sorted by sortLinks()
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

        // Display logic for scheduled time
        if (linkObj.scheduledDateTimeActual) {
            const scheduleDisplay = document.createElement('span');
            scheduleDisplay.className = 'scheduled-time';
            const formattedDate = new Date(linkObj.scheduledDateTimeActual).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'});
            scheduleDisplay.textContent = `Visit: ${formattedDate}`;
            // Add original input as a tooltip if it was different and was a relative time
            if (linkObj.scheduledTimeDisplay && parseRelativeTimeAndCalcFutureDate(linkObj.scheduledTimeDisplay)) {
                 scheduleDisplay.title = `Original input: "${linkObj.scheduledTimeDisplay}"`;
            }
            listItem.appendChild(scheduleDisplay);
        } else if (linkObj.scheduledTimeDisplay) { // Fallback to display string if no actual date
            const scheduleDisplay = document.createElement('span');
            scheduleDisplay.className = 'scheduled-time';
            scheduleDisplay.textContent = `Visit: ${linkObj.scheduledTimeDisplay}`;
            listItem.appendChild(scheduleDisplay);
        }

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        // ... (rest of remove button setup)
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

// --- Event listener for "Add New Link" button (Add dateAdded) ---
function setupAddLinkButtonListener() {
    if (showAddLinkDialogBtn) {
        showAddLinkDialogBtn.addEventListener('click', () => {
            const newLinkText = prompt("Enter the text/name for the new link:");
            // ... (rest of validation as before) ...
            if (newLinkText === null || newLinkText.trim() === "") { /* ... */ return; }

            const newLinkUrl = prompt("Enter the full URL for the new link (e.g., https://www.example.com):");
            // ... (rest of validation as before) ...
            if (newLinkUrl === null || newLinkUrl.trim() === "") { /* ... */ return; }

            let cleanUrl = newLinkUrl.trim();
            if (!cleanUrl.toLowerCase().startsWith('http://') && !cleanUrl.toLowerCase().startsWith('https://')) {
                if (confirm(`The URL doesn't start with http:// or https://. Should we add "https://"?\n\n(Your URL: ${cleanUrl})`)) {
                    cleanUrl = 'https://' + cleanUrl;
                } else {
                    alert("Invalid URL format. Link not added."); return;
                }
            }

            const newLink = {
                text: newLinkText.trim(),
                url: cleanUrl,
                dateAdded: Date.now() // Add timestamp
                // scheduledTimeDisplay and scheduledDateTimeActual will be undefined initially
            };
            links.push(newLink);
            saveLinksToLocalStorage();
            sortLinks(); // Sort after adding
            renderLinks();
            logToPage(`New link "${newLink.text}" added.`);
        });
    }
}

// --- Initial setup when the page loads ---
document.addEventListener('DOMContentLoaded', () => {
    linkListElement = document.getElementById('linkList');
    clickLogElement = document.getElementById('clickLog');
    showAddLinkDialogBtn = document.getElementById('showAddLinkDialogBtn');
    sortCriteriaSelect = document.getElementById('sortCriteria');

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

    sortLinks(); // Initial sort
    renderLinks();
    setupAddLinkButtonListener();
    logToPage("Link manager initialized. Current time: " + new Date().toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'}));
});
