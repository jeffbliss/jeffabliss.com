export const prompts = {
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