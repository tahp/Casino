// --- Configuration: Define your links here ---
// Added a scheduledTime to the first link for demonstration
const links = [
    { text: "Google Search", url: "https://www.google.com", scheduledTime: "Tomorrow AM" },
    { text: "Wikipedia Encyclopedia", url: "https://www.wikipedia.org" },
    { text: "Example Domain Info", url: "https://www.example.com" },
    { text: "Developer Mozilla", url: "https://developer.mozilla.org" }
];

// DOM elements are selected once the DOM is loaded,
// so ensure this script is loaded with 'defer' or placed at the end of <body>,
// or wrap selections in DOMContentLoaded listener (which we are doing for initial render).
let linkListElement;
let clickLogElement;
let showAddLinkDialogBtn;


// --- Helper function to log messages to the page ---
function logToPage(message) {
    const now = new Date();
    const timestamp = now.toLocaleString(); // e.g., "5/14/2025, 8:00:00 PM"
    const logEntry = document.createElement('p');
    logEntry.classList.add('log-entry');
    logEntry.textContent = `[${timestamp}] ${message}`;
    // Prepend to have newest logs on top
    if (clickLogElement && clickLogElement.firstChild) { // Check if clickLogElement is initialized
        clickLogElement.insertBefore(logEntry, clickLogElement.firstChild);
    } else if (clickLogElement) {
        clickLogElement.appendChild(logEntry);
    }
}

// --- Function to handle link removal ---
function handleRemoveLink(linkToRemove) {
    if (confirm(`Are you sure you want to remove the link "${linkToRemove.text}"? This cannot be undone.`)) {
        // Find the index of the link object in the array
        const index = links.findIndex(link => link.url === linkToRemove.url && link.text === linkToRemove.text);
        if (index > -1) {
            links.splice(index, 1); // Remove the link from the array
            renderLinks(); // Re-render the updated list
            logToPage(`Link "${linkToRemove.text}" removed.`);
            console.log(`Link "${linkToRemove.text}" removed.`);
        } else {
            // This case should ideally not happen if linkToRemove is from the list
            logToPage(`Error: Could not find link "${linkToRemove.text}" to remove.`);
            console.error(`Error: Could not find link "${linkToRemove.text}" to remove.`);
        }
    }
}

// --- Function to handle link clicks (for visiting or scheduling) ---
function handleLinkClick(event, linkObject) {
    event.preventDefault(); // Prevent default navigation

    const url = linkObject.url;
    const linkText = linkObject.text;
    let activityMessage = `Clicked "${linkText}" (${url}).`;

    console.log(`User clicked on "${linkText}".`);

    if (confirm(`You clicked on "${linkText}".\nDo you want to visit ${url} now?`)) {
        activityMessage += ` User chose to visit immediately. Navigating...`;
        logToPage(activityMessage);
        console.log(`User chose to visit "${linkText}" immediately.`);
        window.location.href = url; // Navigate
    } else {
        activityMessage += ` User chose NOT to visit immediately.`;
        console.log(`User chose not to visit "${linkText}" immediately.`);

        const visitLaterTimeInput = prompt(
            `You chose not to visit "${linkText}" now.\nWould you like to set/update a reminder time for this link?\n(Leave blank to clear existing reminder)`,
            linkObject.scheduledTime || "" // Pre-fill with existing time or empty
        );

        if (visitLaterTimeInput && visitLaterTimeInput.trim() !== "") {
            const visitLaterTime = visitLaterTimeInput.trim();
            linkObject.scheduledTime = visitLaterTime; // Store/update on the link object
            activityMessage += ` Reminder set/updated to: ${visitLaterTime}.`;
        } else if (visitLaterTimeInput === "") { // User explicitly cleared the input
            delete linkObject.scheduledTime; // Remove the scheduled time property
            activityMessage += ` Reminder cleared.`;
        } else { // User pressed cancel (prompt returns null)
            activityMessage += ` User declined to set/update a reminder.`;
        }
        logToPage(activityMessage);
        renderLinks(); // Re-render the list to show any changes
    }
}

// --- Function to render the links on the page ---
function renderLinks() {
    if (!linkListElement) return; // Guard against element not being ready

    linkListElement.innerHTML = ''; // Clear the list before re-rendering

    if (!links || links.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.textContent = 'No links have been added yet. Click "Add New Link" below!';
        emptyLi.style.justifyContent = 'center'; // Center the text
        emptyLi.style.color = '#6c757d'; // Muted color
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
        anchorTag.title = `Visit ${linkObj.text}`; // Tooltip for accessibility
        anchorTag.addEventListener('click', (event) => handleLinkClick(event, linkObj));
        linkTextContainer.appendChild(anchorTag);
        listItem.appendChild(linkTextContainer);

        if (linkObj.scheduledTime) {
            const scheduleDisplay = document.createElement('span');
            scheduleDisplay.className = 'scheduled-time';
            scheduleDisplay.textContent = `Visit: ${linkObj.scheduledTime}`;
            listItem.appendChild(scheduleDisplay);
        }

        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'remove-btn';
        removeButton.title = `Remove link: ${linkObj.text}`; // Tooltip for accessibility
        removeButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent li's click event if any were attached to it
            handleRemoveLink(linkObj);
        });
        listItem.appendChild(removeButton);

        linkListElement.appendChild(listItem);
    });
}

// --- Event listener for "Add New Link" button ---
function setupAddLinkButtonListener() {
    if (showAddLinkDialogBtn) {
        showAddLinkDialogBtn.addEventListener('click', () => {
            const newLinkText = prompt("Enter the text/name for the new link:");
            if (newLinkText === null) return; // User pressed Cancel
            if (newLinkText.trim() === "") {
                alert("Link text cannot be empty. Link not added.");
                return;
            }

            const newLinkUrl = prompt("Enter the full URL for the new link (e.g., https://www.example.com):");
            if (newLinkUrl === null) return; // User pressed Cancel
            if (newLinkUrl.trim() === "") {
                alert("Link URL cannot be empty. Link not added.");
                return;
            }

            let cleanUrl = newLinkUrl.trim();
            if (!cleanUrl.toLowerCase().startsWith('http://') && !cleanUrl.toLowerCase().startsWith('https://')) {
                if (confirm(`The URL doesn't start with http:// or https://. Should we add "https://"?\n\n(Your URL: ${cleanUrl})`)) {
                    cleanUrl = 'https://' + cleanUrl;
                } else {
                    alert("Invalid URL format. Link not added. Please include http:// or https://.");
                    return;
                }
            }

            const newLink = { text: newLinkText.trim(), url: cleanUrl };
            links.push(newLink); // Add the new link object to the array
            renderLinks(); // Re-render the list
            logToPage(`New link "${newLink.text}" added.`);
            console.log(`New link "${newLink.text}" (${newLink.url}) added.`);
        });
    }
}


// --- Initial setup when the page loads ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM element variables now that the DOM is ready
    linkListElement = document.getElementById('linkList');
    clickLogElement = document.getElementById('clickLog');
    showAddLinkDialogBtn = document.getElementById('showAddLinkDialogBtn');

    renderLinks(); // Display initial links
    setupAddLinkButtonListener(); // Setup listener for the add button
    logToPage("Link manager initialized. Current time: " + new Date().toLocaleTimeString());
});
