// script.js (Showing key changes and new functions)

// ... (Keep existing top constants, DOM variable declarations, save/load functions for links and sort criteria) ...
// ... (Keep logToPage, handleRemoveLink, sortLinks, setupAddLinkButtonListener) ...

// --- NEW: Date Time Helper Functions ---
/**
 * Converts an ISO string (UTC) to the 'YYYY-MM-DDTHH:MM' format
 * required by <input type="datetime-local">, adjusted for the local timezone.
 */
function getLocalDateTimePickerValue(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString); // Date object is in local time based on ISO string

    // Create a new date object that is offset to "pretend" it's UTC
    // for the purpose of getting YYYY-MM-DDTHH:MM that represents local time.
    // This handles the timezone offset correctly for the input field.
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 16); // Extracts YYYY-MM-DDTHH:MM
}

/**
 * Converts a 'YYYY-MM-DDTHH:MM' string from <input type="datetime-local">
 * (which is local time) back to a UTC ISO string for storage.
 */
function getISOStringFromDateTimePickerValue(localDateTimeString) {
    if (!localDateTimeString) return null;
    // The input string 'YYYY-MM-DDTHH:MM' is treated as local time by new Date()
    const date = new Date(localDateTimeString);
    if (isNaN(date.getTime())) return null; // Invalid date string
    return date.toISOString();
}

// --- MODIFIED: parseRelativeTimeAndCalcFutureDate (no changes needed here from before) ---
// ... (Keep the existing parseRelativeTimeAndCalcFutureDate function) ...

// --- MODIFIED: handleLinkClick (Main change is in how the prompt/schedule update is handled) ---
function handleLinkClick(event, linkObject) {
    event.preventDefault();
    const url = linkObject.url;
    const linkText = linkObject.text;
    let baseActivityMessage = `Clicked "${linkText}" (${url}).`;
    let detailedReminderMessage = "";
    let linksModified = false; // Flag to track if actual data changed

    if (confirm(`You clicked on "${linkText}".\nDo you want to visit ${url} now?`)) {
        detailedReminderMessage = ` User chose to visit immediately. Navigating...`;
        logToPage(baseActivityMessage + detailedReminderMessage);
        window.location.href = url;
    } else {
        detailedReminderMessage = ` User chose NOT to visit immediately.`;
        // The prompt is still an option for quick text or relative time input
        // We'll also make the displayed date itself clickable for a calendar.
        const currentScheduledTimeForPrompt = linkObject.scheduledTimeDisplay ||
                                           (linkObject.scheduledDateTimeActual ? new Date(linkObject.scheduledDateTimeActual).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'}) : "");

        const visitLaterTimeInput = prompt(
            `Set/update reminder for "${linkText}":\n(e.g., "2 hours from now", or click the displayed date for a calendar).\nLeave blank to clear reminder.`,
            currentScheduledTimeForPrompt
        );

        if (visitLaterTimeInput !== null) { // User clicked OK (input can be empty)
            const trimmedInput = visitLaterTimeInput.trim();
            if (trimmedInput === "") { // Cleared via prompt
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
                        delete linkObject.scheduledDateTimeActual; // No longer a valid calculated date
                        linksModified = true;
                    }
                    detailedReminderMessage += ` Reminder text set via prompt to: "${trimmedInput}" (not a parseable relative time).`;
                }
            }
        } else { // User pressed cancel on prompt
            detailedReminderMessage += ` User declined to update reminder via prompt.`;
        }

        logToPage(baseActivityMessage + detailedReminderMessage);
        if (linksModified) {
            saveLinksToLocalStorage();
            sortLinks();
        }
        renderLinks(); // Re-render to reflect changes or if prompt was cancelled
    }
}

// --- NEW: Function to make the schedule display editable with a datepicker ---
function makeScheduleEditable(linkObject, displaySpanElement) {
    const originalDateTimeActual = linkObject.scheduledDateTimeActual;
    const originalTimeDisplay = linkObject.scheduledTimeDisplay;

    displaySpanElement.style.display = 'none'; // Hide the text span

    const input = document.createElement('input');
    input.type = 'datetime-local';
    input.className = 'schedule-datetime-input';
    input.value = getLocalDateTimePickerValue(linkObject.scheduledDateTimeActual);

    let hasChanged = false; // Flag to track if input value actually changed

    // Function to finalize editing
    const finalizeEdit = (saveChanges) => {
        // Remove input from DOM - renderLinks will rebuild the span
        if (input.parentNode) {
            input.parentNode.removeChild(input);
        }
        // Restore span visibility - renderLinks will handle this by rebuilding
        // displaySpanElement.style.display = '';

        if (saveChanges) {
            const newPickerValue = input.value; // Value from datetime-local input
            if (newPickerValue) {
                const newIsoString = getISOStringFromDateTimePickerValue(newPickerValue);
                if (newIsoString) { // Valid date from picker
                    if (linkObject.scheduledDateTimeActual !== newIsoString) {
                        linkObject.scheduledDateTimeActual = newIsoString;
                        // Update display string to reflect the picked date accurately
                        linkObject.scheduledTimeDisplay = new Date(newIsoString).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
                        hasChanged = true; // Mark as changed for saving
                        logToPage(`Reminder for "${linkObject.text}" updated via calendar to: ${linkObject.scheduledTimeDisplay}`);
                    }
                } else { // Should not happen if browser enforces datetime-local format
                    logToPage(`Invalid date from calendar for "${linkObject.text}". Reverting.`);
                    // Revert to original if input was somehow invalid
                    linkObject.scheduledDateTimeActual = originalDateTimeActual;
                    linkObject.scheduledTimeDisplay = originalTimeDisplay;
                }
            } else { // Input was cleared
                if (linkObject.scheduledDateTimeActual || linkObject.scheduledTimeDisplay) {
                    delete linkObject.scheduledDateTimeActual;
                    delete linkObject.scheduledTimeDisplay;
                    hasChanged = true;
                    logToPage(`Reminder for "${linkObject.text}" cleared via calendar.`);
                }
            }
        } else { // Cancelled (e.g., by Escape key) - revert to original values
            linkObject.scheduledDateTimeActual = originalDateTimeActual;
            linkObject.scheduledTimeDisplay = originalTimeDisplay;
            logToPage(`Calendar edit for "${linkObject.text}" cancelled.`);
        }

        if (hasChanged) {
            saveLinksToLocalStorage();
            sortLinks();
        }
        renderLinks(); // Always re-render to show updated span or remove input
    };

    input.addEventListener('change', () => {
        // The 'change' event fires when the value is committed (e.g., date picked, or focus lost after typing)
        // We can use this to mark that a modification is intended.
        // The actual saving will happen on blur or Enter.
    });

    input.addEventListener('blur', () => {
        // If the input is still in the document when it blurs, finalize.
        // This handles clicking away.
        if (document.body.contains(input)) {
            finalizeEdit(true); // Assume blur means accept changes
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finalizeEdit(true); // Commit changes
        } else if (e.key === 'Escape') {
            e.preventDefault();
            finalizeEdit(false); // Cancel changes
        }
    });

    // Insert the input field right after the (now hidden) display span
    displaySpanElement.parentNode.insertBefore(input, displaySpanElement.nextSibling);
    input.focus();
    // try { input.showPicker(); } catch (e) { /* some browsers might not support this */ }
}


// --- MODIFIED: renderLinks (Make scheduled time clickable) ---
function renderLinks() {
    if (!linkListElement) {
        console.error("renderLinks called before linkListElement is defined.");
        return;
    }
    linkListElement.innerHTML = '';

    if (!links || links.length === 0) {
        // ... (empty list message as before) ...
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'No links have been added yet. Click "Add New Link" below!';
        emptyLi.style.justifyContent = 'center';
        emptyLi.style.color = '#6c757d';
        linkListElement.appendChild(emptyLi);
        return;
    }

    links.forEach(linkObj => {
        const listItem = document.createElement('li');
        // ... (linkTextContainer and anchorTag setup as before) ...
        const linkTextContainer = document.createElement('div');
        linkTextContainer.className = 'link-text-container';
        const anchorTag = document.createElement('a');
        anchorTag.href = linkObj.url;
        anchorTag.textContent = linkObj.text;
        anchorTag.title = `Visit ${linkObj.text}`;
        anchorTag.addEventListener('click', (event) => handleLinkClick(event, linkObj)); // This is for the link itself
        linkTextContainer.appendChild(anchorTag);
        listItem.appendChild(linkTextContainer);

        // Display logic for scheduled time (NOW CLICKABLE)
        const scheduleContainer = document.createElement('span'); // A container for either text or input
        listItem.appendChild(scheduleContainer); // Add to DOM early

        let displayString = "";
        let canBeMadeEditable = true;

        if (linkObj.scheduledDateTimeActual) {
            displayString = `Visit: ${new Date(linkObj.scheduledDateTimeActual).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
            if (linkObj.scheduledTimeDisplay && parseRelativeTimeAndCalcFutureDate(linkObj.scheduledTimeDisplay)) {
                scheduleContainer.title = `Original input: "${linkObj.scheduledTimeDisplay}"`;
            } else if (linkObj.scheduledTimeDisplay) {
                 scheduleContainer.title = `Set as: "${linkObj.scheduledTimeDisplay}"`;
            }
        } else if (linkObj.scheduledTimeDisplay) {
            displayString = `Visit: ${linkObj.scheduledTimeDisplay}`;
        } else {
            displayString = "Set Reminder"; // Prompt to set a reminder
            scheduleContainer.style.opacity = "0.7"; // Make it look less prominent
            canBeMadeEditable = true; // Allow clicking "Set Reminder" to open datepicker
        }

        if (displayString) {
            scheduleContainer.className = 'scheduled-time'; // Apply styling
            scheduleContainer.textContent = displayString;
            if(canBeMadeEditable){
                scheduleContainer.style.cursor = 'pointer';
                scheduleContainer.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent link click if schedule is part of it
                    makeScheduleEditable(linkObj, scheduleContainer);
                });
            }
        }


        const removeButton = document.createElement('button');
        // ... (removeButton setup as before) ...
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


// --- Event listener for "Add New Link" button (no changes needed here) ---
// ... (Keep existing setupAddLinkButtonListener function, ensure it sets dateAdded) ...
function setupAddLinkButtonListener() {
    if (showAddLinkDialogBtn) {
        showAddLinkDialogBtn.addEventListener('click', () => {
            const newLinkText = prompt("Enter the text/name for the new link:");
            if (newLinkText === null) return; 
            if (newLinkText.trim() === "") {
                alert("Link text cannot be empty. Link not added.");
                return;
            }

            const newLinkUrl = prompt("Enter the full URL for the new link (e.g., https://www.example.com):");
            if (newLinkUrl === null) return;
            if (newLinkUrl.trim() === "") {
                alert("Link URL cannot be empty. Link not added.");
                return;
            }

            let cleanUrl = newLinkUrl.trim();
            if (!cleanUrl.toLowerCase().startsWith('http://') && !cleanUrl.toLowerCase().startsWith('https://')) {
                if (confirm(`The URL "${cleanUrl}" doesn't start with http:// or https://.\nShould we add "https://"?`)) {
                    cleanUrl = 'https://' + cleanUrl;
                } else {
                    alert("Invalid URL format. Link not added."); return;
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

// --- Initial Setup (DOMContentLoaded) ---
// ... (Keep existing DOMContentLoaded, ensure it calls loadLinks, loadSortCriteria, sortLinks, renderLinks, setupAddLinkButtonListener) ...
document.addEventListener('DOMContentLoaded', () => {
    linkListElement = document.getElementById('linkList');
    clickLogElement = document.getElementById('clickLog');
    showAddLinkDialogBtn = document.getElementById('showAddLinkDialogBtn');
    sortCriteriaSelect = document.getElementById('sortCriteria');

    if (!linkListElement || !clickLogElement || !showAddLinkDialogBtn || !sortCriteriaSelect) {
        console.error("One or more critical DOM elements could not be found. App may not function correctly.");
        const errorDiv = document.createElement('div');
        errorDiv.textContent = "Error: Critical page elements missing. Please check HTML structure.";
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

    logToPage("Link manager initialized. Current time: " + new Date().toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'}));
    console.log("DOMContentLoaded: Initialization complete. Initial links array:", JSON.parse(JSON.stringify(links)));
});
