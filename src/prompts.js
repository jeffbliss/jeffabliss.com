export const prompts = {
  general: `I need to be able to pass prompts to the src/components/Footer.jsx component from src/prompts.js based on what page I am on. 

What would you suggest I do to accomplish this?

I want you to add this prompt to a new Accordion on src/components/Footer.jsx called "Prompts used for general development" and add a new object in src/prompts.js called general. I also want you to change "This Page" to "Prompts used in this page" and "Footer" to "Prompts used for Footer component"

Update src/App.jsx so that every page that we decide to render is contained in a flexbox. I want my site to be navigable on both desktop and mobile

Create two new components in src/pages/
1. NemacExampleSite.jsx
2. NemacPresentation.jsx

Update src/App.jsx to remove all routes except for / and add src/pages/NemacExampleSite.jsx and src/pages/NemacPresentation.jsx as two new routes

Add a new key for each Day in src/data/AppalachianTrailDetails.js called state and populate it with the following:
Day 1 through Day 9 - state: "Georgia"
Day 10 through Day 40 - state: "North Carolina, Tennessee"
Day 41 to Day 44 - state: "Tennessee"
Day 45 - state: "Tennessee, Virginia"
Day 46 to Day 92- state: "Virginia"
Day 93 - state: "Virginia, West Virginia"
Day 94 - state "West Virginia, Maryland"
Day 95 - state: "Maryland"
Day 96 - state: "Maryland, Pennsylvania"
Day 97 to Day 113 - state: "Pennsylvania"
Day 114 - state "Pennsylvania, New Jersey"
Day 115 to Day 117 - state: "New Jersey"
Day 118 - state: "New Jersey, New York"
Day 119 to Day 126 - state: "New York"
Day 127 - state: "New York, Connecticut"
Day 128 to Day 130 - state: "Connecticut"
Day 131: state: "Connecticut, Massachusetts"
Day 132 to Day 139 -  state: "Massachusetts"
Day 140 -  state: "Massachusetts, Vermont"
Day 141 to Day 150 -  state: "Vermont"
Day 151 - state: "Vermont, New Hampshire"
Day 152 to Day 169 - state: "New Hampshire"
Day 170 - state: "New Hampshire, Maine"
Day 171 to Day 193 - state: "Maine"


`,
  Home: `Update src/pages/Home.jsx:
1. Add two new Box links with routes to src/pages/NemacExampleSite.jsx on the left and src/pages/NemacPresentation.jsx on the right
2. These Box links will be formatted using Grid with md=6 breakpoint and sm=12 breakpoint
3. Add this prompt to Home in src/prompts.js

Update src/pages/Home.jsx again so that the Box links are centered horizontally on the page.`,
  AppalachianTrail: `Let's create a new page in src/pages/ and called it AppalachianTrail.jsx. I want you to design it based off public/design/at_page.pdf with the following guidelines:
- The black box on the right side will be where the React Leaflet Map is
- The blue box on the left side is a MUI Select component of all of the 14 states the Appalachian Trail goes through in order from Georgia to Maine
- The green box will also be a MUI select component and will render choices of "Day 1" sequentially to "Day 193" using data from src/data/AppalachianTrailDetails.js. You only need to read the first 20-30 lines of src/data/AppalachianTrailDetails.js to since the data remains consistent throughout
- The black box with the React Leaflet Map should take up 75% of the available page
- The blue and green box on the left should take up 25% of the available page
- Using MUI Grid to accomplish this and make it so xs=12 in mobile with blue, green, black box the correct sequence
- When a day is selected in the green box it should grab the startingCoordinates and endingCoordinates and add two markers on the React Leaflet Map: green for starting, and red for ending. When you click the marker a popup should appear with the respective startingLocation and endingLocation. This can all be found in src/data/AppalachianTrailDetails.js
- When a state is selected in the blue box the React leaflet map should smoothly pan and zoom into the selected state

You forgot to pan/zoom when selecting a state in src/pages/AppalachianTrail.jsx

Add the previous prompt and additionally in src/pages/AppalachianTrail.jsx:
- Update states coordinates to be more in line with where the Appalachian Trail is in that respective state
- Increase the zoom level by 2 for each state

Update src/pages/AppalachianTrail.jsx so that when you select a state from the MUI Select component in lines 110-122 that updates the available dayKeys for the other Select component in lines 127-142

This will be accomplished by looking up the key called "state" in appalachianTrailDetails and only returning the ones where state is equal to the state selected. e.g. Georgia=Georgia

You can also have two acceptable values in appalachainTrailDetails. E.g. state:"New Hampshire, Maine" - both New Hampshire and Maine should work here

In src/pages/AppalachianTrail.jsx do the following:
- add a new state variable called atCenterLine
- fetch the data from const trailUrl =
      "https://services1.arcgis.com/fBc8EJBxQRMcHlei/arcgis/rest/services/ANST_Facilities/FeatureServer/7/query?where=1%3D1&outFields=*&f=geojson"; using react useEffect on component load
- Render the trail center line like so {trailData && (
          <GeoJSON
            data={trailData}
            style={() => ({
              color: "#387037",
              weight: 4,
              opacity: 0.8,
            })}
          />
        )}
- add this to prompts

One more update in src/pages/AppalachianTrail.jsx 

When selecting a Day I want you to create a function that takes in the values of the startingCoordinates and the endingCoordinates for the selected day and returns a set of coordinates that is roughly in between the two and a zoom value of 13. I then want the map to smoothly pan and zoom to the new coordinates and zoom value whenever a new day is selected

`,
  Quiz: ``,
  NemacPresentation: `Let's work on src/pages/NemacPresentation.jsx now. I want you to create a title centered on the page that says "Inspiration" and then below it is a Button link with the text that says "Thanks Greg" and when clicked opens up a new tab that links to "https://drive.google.com/file/d/1XaS__pata90QQH-lgHaiJdydx2zgfHbO/view?usp=drive_link"`,
  AppalachianTrailMap: ``,
  Dave: `Let's create a new component called "src/components/Dave.jsx" and use public/design/dave_page.pdf as the template for styling it. 

Please do the following on this new Dave.jsx page component:
1. The words "DAVID" should flash on and off in black and white every 0.5 seconds while also scrolling from right to left across the page. When it reaches the end of the page it should wrap back around to the right side like this:   [AVID        D]
2. The rectangle at the bottom of the page below the bearded emoji should use MUI typography and say "You did this to yourself David"
3. There should be a MUI play button just below the bearded emoji that when you press it does the following:
  - Text appears in the speech bubble that says "Hello, I'm David!"
  - Audio plays in the browser using artifical speech that says "Hello, I'm David!"
4. Add the Dave page to src/App.jsx and src/components/Navbar.jsx
5. Create a new section in src/prompts.js called "Dave" and add the contents of this prompt to it

UPDATE: The src/components/Dave.jsx component needs some updates.
1. Use this pasted image instead of the generic emoji
2. The speech bubble needs to be rendered to the up and right side of the Dave Image
3. The speech bubble needs to disappear when the audio stops playing 
4. The "You did this to yourself David" part of the page is being rendered below the Footer. I need everything below the scrolling DAVID to be shifted up by about 20% on the page
5. Add this prompt to Dave in src/prompts.js

UPDATE 2: Oh dear lord that generated public/images/dave-avatar.svg is absolutely horrifying! Let's make some more changes to src/components/Dave.jsx
1. Use public/images/daveism.png instead of public/images/dave-avatar.svg
2. Place the play button and public/images/daveism.png higher up on the page. As you can see in this pasted image the play button is being obscured by the text box
3. Add both a import ToggleOffIcon from '@mui/icons-material/ToggleOff'; and import ToggleOnIcon from '@mui/icons-material/ToggleOn'; switch to the left of the play button that will do the following:
  - Toggle Off will be named "Daveism" and will render public/images/daveism.png when in this state
  - Toggle On will be named "omg lol" and will render public/images/dave-avatar.svg when in this state
4. Add this to Dave prompts`,
  Footer: `1. Initial Footer Creation:
I want you to add a new component in src/components/ called Footer.jsx that will be imported and present on all pages just like src/components/Navbar.jsx is

This Footer will live at the bottom of the page and have a question mark MUI icon on the right side. 

The question mark MUI icon will have a tooltip hover that says "See prompt used" that when clicked will open up a MUI Popover that will show the prompt used to generate the component.

Use this EXACT prompt as an example during the generation of the new Footer.jsx component

2. Footer Accordion Update:
Update the src/components/Footer.jsx.jsx Popover to include two MUI Accordion components:
- First Accordion says This Page
- Second Accordion says Footer

Only one Accordion can be expanded at a time. The other accordion should collapse when you expand one.

The details under This Page are examples of prompts used for the particular page you are on. So for example, if I am on the src/components/AppalachianTrailMap.jsx page, This Page should show details for that page. src/components/Footer.jsx will need to take in a prop from the implementing page

The details under Footer should include the prompts used for the src/components/Footer.jsx component. That includes this prompt.

3. Popover Position Fix:
src/components/Footer.jsx Popover position needs to be updated so that it is in a fixed position relative to the question mark icon. The far right side of it should be above the queston mark.

The issue I'm having is that when I expand the Accordion it is pushing the Popover off the page. Add this prompt to src/components/Footer.jsx too.

4. Fixed Size Popover:
As you can see in the image the Popover is still being pushed off the screen when the Accordion is expanded. I need the Popover to take up a fixed amount of space regardless of whether or not an Accordion is expanded or not.

The Popover should have a fixed size and the content should scroll within that fixed container when accordions are expanded. Add this to the Footer prompts.

5. Prompts File Creation:
Transfer all of the prompts that are currently in footerPrompts in src/components/Footer.jsx into a new js file called src/prompts.js

The structure of this new prompts.js file will be an exported const variable called prompts = [] and will be a list of objects with the keys being the page and the value being all the prompts for the respective page. So for src/components/Footer.jsx it will be prompts = [Footer: {}]

Remember to import the prompts.js file in src/components/Footer.jsx and also add this prompt to the footerPrompts`,
};
