export const prompts = {
  general: `I need to be able to pass prompts to the src/components/Footer.jsx component from src/prompts.js based on what page I am on. 

What would you suggest I do to accomplish this?

I want you to add this prompt to a new Accordion on src/components/Footer.jsx called "Prompts used for general development" and add a new object in src/prompts.js called general. I also want you to change "This Page" to "Prompts used in this page" and "Footer" to "Prompts used for Footer component"`,
  Home: ``,
  AppalachianTrail: ``,
  Quiz: ``,
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

Remember to import the prompts.js file in src/components/Footer.jsx and also add this prompt to the footerPrompts`
};