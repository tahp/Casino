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
    // Regex: captures value, unit, and suffix. Case-insensitive.
    const regex = /^(\d+(\.\d+)?)\s+(hour|hr|minute|min|day)s?\s+(?:from\s+now|later|hence)$/i;
    const match = cleanedInput.match(regex);

    if (match) {
        const value = parseFloat(match[1]);
        let unit = match[3]; // e.g., "hour", "hr", "minute", "min", "day"

        // Normalize unit
        if (unit === 'hr') unit = 'hour';
        if (unit === 'min') unit = 'minute';

        let futureDate = new Date(); // Start with current date/time for calculation

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
                console.warn("parseRelativeTimeAndCalcFutureDate: Unknown unit matched - ", unit);
                return null; // Should not be reached if regex is correct
        }
        console.log(`Parsed "${inputString}" to: ${futureDate.toISOString()}`);
        return futureDate;
    }
    console.log(`Could not parse relative time: "${inputString}"`);
    return null; // No match
}

// --- Local Storage Functions ---
function saveLinksToLocalStorage() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY_LINKS, JSON.stringify(links));
        // console.log("Links saved to Local Storage.");
    } catch (e) {
        console.error("Could not save links to Local Storage:", e);
    }
}

function saveSortCriteriaToLocalStorage() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY_SORT, currentSortCriteria);
        // console.log("Sort criteria saved:", currentSortCriteria);
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
            scheduledTimeDisplay: "Tomorrow AM", // User-friendly display string
            // scheduledDateTimeActual: null, // No actual calculation for this default string
            dateAdded: now - 200000 // ~3 mins ago
        },
        {
            text: "Wikipedia (Default)",
            url: "https://www.wikipedia.org",
            dateAdded: now - 100000 // ~1.5 mins ago
        },
        {
            text: "Developer Mozilla (Default)",
            url: "https://developer.mozilla.org",
            dateAdded: now // Just now
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
                // Data migration/ensure properties for all links
                parsedLinks = parsedLinks.map(link => {
                    const migratedLink = {
                        ...link,
                        dateAdded: link.dateAdded === undefined ? 0 : link.dateAdded // Default old links to timestamp 0
                    };

                    // One-time migration attempt for old `scheduledTime` string field
                    if (migratedLink.scheduledTime && migratedLink.scheduledDateTimeActual === undefined) {
                        migratedLink.scheduledTimeDisplay = migratedLink.scheduledTime; // Preserve original string
                        const calculatedDate = parseRelativeTimeAndCalcFutureDate(migratedLink.scheduledTime);
                        if (calculatedDate) {
                            migratedLink.scheduledDateTimeActual = calculatedDate.toISOString();
                        }
                        delete migratedLink.scheduledTime; // Clean up the old, ambiguous field
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
        console.log("Loaded sort criteria from Local Storage:", storedSortCriteria);
        return storedSortCriteria;
    }
    console.log("No sort criteria in Local Storage, using default:", currentSortCriteria);
    return currentSortCriteria; // Default if nothing is stored
}


// --- Sorting Function ---
function sortLinks() {
    console.log("Sorting links by:", currentSortCriteria);
    links.sort((a, b) => {
        switch (currentSortCriteria) {
            case 'dateAdded_desc': // Newest first
                return (b.dateAdded || 0) - (a.dateAdded || 0);
            case 'dateAdded_asc': // Oldest first
                return (a.dateAdded || 0) - (b.dateAdded || 0);
            case 'text_asc':
                return a.text.localeCompare(b.text);
            case 'text_desc':
                return b.text.localeCompare(a.text);
            case 'scheduledTime_asc': // Sort by actual calculated date if available
                // Items with actual dates come first, sorted chronologically
                // Then items with only display strings, sorted alphabetically
                // Then items with no schedule info
                if (a.scheduledDateTimeActual && !b.scheduledDateTimeActual) return -1;
                if (!a.scheduledDateTimeActual && b.scheduledDateTimeActual) return 1;
                if (a.scheduledDateTimeActual && b.scheduledDateTimeActual) {
                    return new Date(a.scheduledDateTimeActual) - new Date(b.scheduledDateTimeActual);
                }
                // Fallback for items without calculated dates (compare by display string)
                if (a.scheduledTimeDisplay && !b.scheduledTimeDisplay) return -1;
                if (!a.scheduledTimeDisplay && b.scheduledTimeDisplay) return 1;
                if (a.scheduledTimeDisplay && b.scheduledTimeDisplay) {
                    return a.scheduledTimeDisplay.localeCompare(b.scheduledTimeDisplay);
                }
                return 0; // Both have no schedule info or are considered equal
            case 'scheduledTime_desc':
                if (a.scheduledDateTimeActual && !b.scheduledDateTimeActual) return -1; // a (with date) still comes "before" b (no date) in a descending sort of dates
                if (!a.scheduledDateTimeActual && b.scheduledDateTimeActual) return 1;
                if (a.scheduledDateTimeActual && b.scheduledDateTimeActual) {
                    return new Date(b.scheduledDateTimeActual) - new Date(a.scheduledDateTimeActual);
                }
                // Fallback
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
    saveSortCriteriaToLocalStorage(); // Save the current sort preference
}

// --- UI Helper Functions ---
function logToPage(message) {
    const now = new Date();
    const timestamp = now.toLocaleString([], {dateStyle: 'short', timeStyle: 'medium'});
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
    if (confirm(`Are you sure you want to remove the link "${linkToRemove.text}"? This cannot be undone.`)) {
        const index = links.findIndex(link => link.url === linkToRemove.url && link.text === linkToRemove.text);
        if (index > -1) {
            links.splice(index, 1);
            saveLinksToLocalStorage();
            // The list is already sorted; removing an item doesn't change sort order of others
            renderLinks(); // Just re-render
            logToPage(`Link "${linkToRemove.text}" removed.`);
        } else {
            logToPage(`Error: Could not find link "${linkToRemove.text}" in the array to remove.`);
            console.error(`Error finding link to remove:`, linkToRemove, `Current links:`, links);
        }
    }
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
            `Set/update reminder for "${linkText}":\n(e.g., "2.5 hours from now", "1 day later", or a specific date like "May 16, 10:00 AM").\nLeave blank to clear reminder.`,
            currentScheduledTimeForPrompt
        );

        if (visitLaterTimeInput !== null) { // User clicked OK (input can be an empty string)
            const trimmedInput = visitLaterTimeInput.trim();
            if (trimmedInput === "") { // User explicitly cleared the input
                if (linkObject.scheduledTimeDisplay || linkObject.scheduledDateTimeActual) {
                    delete linkObject.scheduledTimeDisplay;
                    delete linkObject.scheduledDateTimeActual;
                    linksModified = true;
                }
                detailedReminderMessage += ` Reminder cleared.`;
            } else {
                const calculatedDate = parseRelativeTimeAndCalcFutureDate(trimmedInput);
                if (calculatedDate) {
                    linkObject.scheduledDateTimeActual = calculatedDate.toISOString();
                    linkObject.scheduledTimeDisplay = trimmedInput; // Store original successful input
                    linksModified = true;
                    detailedReminderMessage += ` Reminder set to: ${new Date(linkObject.scheduledDateTimeActual).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'})} (from input "${trimmedInput}").`;
                } else {
                    // If parsing as relative time fails, store the input as a general display string
                    linkObject.scheduledTimeDisplay = trimmedInput;
                    // Clear any previously calculated actual date if the new input isn't parsable
                    if(linkObject.scheduledDateTimeActual) {
                        delete linkObject.scheduledDateTimeActual;
                    }
                    linksModified = true;
                    detailedReminderMessage += ` Reminder text set to: "${trimmedInput}" (Note: not a parseable relative time).`;
                }
            }
        } else { // User pressed cancel
            detailedReminderMessage += ` User declined to set/update a reminder.`;
        }

        if (linksModified) {
            saveLinksToLocalStorage();
        }
        logToPage(baseActivityMessage + detailedReminderMessage);
        sortLinks(); // Re-sort if scheduled time (actual or display) changed
        renderLinks();
    }
}

function renderLinks() {
    if (!linkListElement) {
        console.error("renderLinks called before linkListElement is defined.");
        return;
    }
    linkListElement.innerHTML = ''; // Clear existing list items

    if (!links || links.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'No links have been added yet. Click "Add New Link" below!';
        emptyLi.style.justifyContent = 'center';
        emptyLi.style.color = '#6c757d';
        linkListElement.appendChild(emptyLi);
        return;
    }

    // The 'links' array is assumed to be already sorted by sortLinks()
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

        // Display logic for scheduled time
        if (linkObj.scheduledDateTimeActual) {
            const scheduleDisplay = document.createElement('span');
            scheduleDisplay.className = 'scheduled-time';
            const formattedDate = new Date(linkObj.scheduledDateTimeActual).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
            scheduleDisplay.textContent = `Visit: ${formattedDate}`;
            // Show original relative input as a tooltip if it was successfully parsed
            if (linkObj.scheduledTimeDisplay && parseRelativeTimeAndCalcFutureDate(linkObj.scheduledTimeDisplay)) {
                scheduleDisplay.title = `Original input: "${linkObj.scheduledTimeDisplay}"`;
            }
            listItem.appendChild(scheduleDisplay);
        } else if (linkObj.scheduledTimeDisplay) { // Fallback to display string if no actual calculated date
            const scheduleDisplay = document.createElement('span');
            scheduleDisplay.className = 'scheduled-time';
            scheduleDisplay.textContent = `Visit: ${linkObj.scheduledTimeDisplay}`;
            listItem.appendChild(scheduleDisplay);
        }

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'remove-btn';
        removeButton.title = `Remove link: ${linkObj.text}`;
        removeButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event bubbling
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
            if (newLinkText === null) return; // User cancelled
            if (newLinkText.trim() === "") {
                alert("Link text cannot be empty. Link not added.");
                return;
            }

            const newLinkUrl = prompt("Enter the full URL for the new link (e.g., https://www.example.com):");
            if (newLinkUrl === null) return; // User cancelled
            if (newLinkUrl.trim() === "") {
                alert("Link URL cannot be empty. Link not added.");
                return;
            }

            let cleanUrl = newLinkUrl.trim();
            if (!cleanUrl.toLowerCase().startsWith('http://') && !cleanUrl.toLowerCase().startsWith('https://')) {
                if (confirm(`The URL "${cleanUrl}" doesn't start with http:// or https://.\nShould we add "https://"?`)) {
                    cleanUrl = 'https://' + cleanUrl;
                } else {
                    alert("Invalid URL format. Link not added. Please include http:// or https://.");
                    return;
                }
            }

            const newLink = {
                text: newLinkText.trim(),
                url: cleanUrl,
                dateAdded: Date.now(), // Add timestamp when link is created
                // scheduledTimeDisplay and scheduledDateTimeActual will be undefined initially
            };
            links.push(newLink);
            saveLinksToLocalStorage();
            sortLinks(); // Sort after adding (important if default sort is by dateAdded)
            renderLinks();
            logToPage(`New link "${newLink.text}" added.`);
        });
    } else {
        console.error("Add New Link button not found during setup.");
    }
}

// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM element variables
    linkListElement = document.getElementById('linkList');
    clickLogElement = document.getElementById('clickLog');
    showAddLinkDialogBtn = document.getElementById('showAddLinkDialogBtn');
    sortCriteriaSelect = document.getElementById('sortCriteria');

    if (!linkListElement || !clickLogElement || !showAddLinkDialogBtn || !sortCriteriaSelect) {
        console.error("One or more critical DOM elements could not be found. App may not function correctly.");
        // Display a user-facing error message on the page itself
        const errorDiv = document.createElement('div');
        errorDiv.textContent = "Error: Critical page elements missing. Please check HTML structure.";
        errorDiv.style.color = 'red';
        errorDiv.style.fontWeight = 'bold';
        errorDiv.style.padding = '20px';
        errorDiv.style.textAlign = 'center';
        document.body.prepend(errorDiv); // Prepend to make it visible
        return; // Stop further execution if critical elements are missing
    }

    console.log("DOMContentLoaded: Event fired. DOM elements selected.");

    links = loadLinksFromLocalStorage(); // Load links from Local Storage or get defaults
    currentSortCriteria = loadSortCriteriaFromLocalStorage(); // Load preferred sort order

    if (sortCriteriaSelect) {
        sortCriteriaSelect.value = currentSortCriteria; // Set dropdown to match loaded/default criteria
        sortCriteriaSelect.addEventListener('change', (event) => {
            currentSortCriteria = event.target.value;
            sortLinks(); // Sort with new criteria
            renderLinks(); // Re-render the sorted list
        });
    }

    sortLinks(); // Apply initial sort based on loaded/default criteria
    renderLinks(); // Display initial links
    setupAddLinkButtonListener(); // Setup listener for the "Add New Link" button

    logToPage("Link manager initialized. Data and sort preference loaded. Current time: " + new Date().toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'}));
    console.log("DOMContentLoaded: Initialization complete. Initial links array:", JSON.parse(JSON.stringify(links)));
});
