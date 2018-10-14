# no-js-fixer

no-js-fixer is a userscript that fixes webpages which unnecessarily break when javascript is disabled. This kind of web development practice has become an epidemic. In addition to fixes for specific websites, this script identifies and fixes common problems encountered with javascript disabled or when blocking third-party resources with something like umatrix. 

Current features:
- Images that are styled as invisible or blurred, which are supposed to be made visible by javascript on the page when scrolled to as part of an unnecessary gimmick. They remain like this if javascript is disabled. This script identifies images styled like this and makes them visible
- Converts youtube embeds to links
- Converts images channeled through embed.ly ifrmaes into normal img elements pointing directly to the source
- Fixes SVG graphics being extremely oversized when the css for them is not loaded (an issue with browsers, actually).
- Removes click protection from images intended to prevent saving the image
- A common practice is lazy load images which have the src set to either nothing or to some placeholder image. The real src is in a different attribute, and javascript is used to set the src when the image is scrolled to. Without javascript, this breaks. Heuristics are used to identify the attribute that likely contains the real image, and the src is set to that.
- On some websites, links to external sites are changed to a link to a tracking page on the site which redirects to the external site. These links are converted to direct links for major sites known to do this.
- Fixes some miscellaneous websites with easily fixable defects

The nature of this userscript makes it highly amenable to contributions which fix certain sites. Ideally, if the issue is something widespread on multiple websites and it can be detected, it is preferable to fix it in general than for specific sites. As this userscript grows over time, I'll consider converting it into an addon.