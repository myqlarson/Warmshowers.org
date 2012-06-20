
OverlayMessage=function(container)
{var parent=container.parentNode;var wrapper=document.createElement('div');wrapper.style.cssText=container.style.cssText;parent.insertBefore(wrapper,container);parent.removeChild(container);wrapper.appendChild(container);container.style.cssText='position: relative; width: 100%; height: 100%;';this.overlay=document.createElement('div');wrapper.appendChild(this.overlay);this.visibleStyle='position: relative; top: -55%; background-color: '+OverlayMessage.backgroundColor+'; width: 40%; text-align: center; margin-left: auto; margin-right: auto; padding: 2em; border: 0.08in ridge '+OverlayMessage.borderColor+'; z-index: 100; opacity: .75; filter: alpha(opacity=75);';this.invisibleStyle='display: none;';this.overlay.style.cssText=this.invisibleStyle;};OverlayMessage.backgroundColor='#9999cc';OverlayMessage.borderColor='#666699';OverlayMessage.prototype.Set=function(message)
{this.overlay.innerHTML=message;this.overlay.style.cssText=this.visibleStyle;};OverlayMessage.prototype.Clear=function()
{this.overlay.style.cssText=this.invisibleStyle;};OverlayMessage.SetBackgroundColor=function(color)
{OverlayMessage.backgroundColor=color;};OverlayMessage.SetBorderColor=function(color)
{OverlayMessage.borderColor=color;};