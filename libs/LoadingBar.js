class LoadingBar {
	constructor(options) {
		// Create the main overlay container
		this.domElement = document.createElement("div");
		this.domElement.style.position = 'fixed';
		this.domElement.style.top = '0';
		this.domElement.style.left = '0';
		this.domElement.style.width = '100%';
		this.domElement.style.height = '100%';
		this.domElement.style.background = '#000';
		this.domElement.style.opacity = '0.7';
		this.domElement.style.display = 'flex';
		this.domElement.style.alignItems = 'center';
		this.domElement.style.justifyContent = 'center';
		this.domElement.style.zIndex = '1111';

		// Create the base of the loading bar
		const barBase = document.createElement("div");
		barBase.style.background = '#aaa';
		barBase.style.width = '50%';
		barBase.style.minWidth = '250px';
		barBase.style.borderRadius = '10px';
		barBase.style.height = '15px';
		barBase.style.overflow = 'hidden';
		barBase.style.boxShadow = '0 0 15px #00bfff';
		this.domElement.appendChild(barBase);

		// Create the actual progress bar
		const bar = document.createElement("div");
		bar.style.background = '#22a';
		bar.style.width = '0';
		bar.style.height = '100%';
		bar.style.borderRadius = '10px';
		bar.style.boxShadow = '0 0 10px #00bfff inset';
		bar.style.animation = 'pulse 1s infinite ease-in-out';
		this.progressBar = bar;
		barBase.appendChild(bar);

		// Add the style animation keyframes to the page
		const style = document.createElement("style");
		style.textContent = `
			@keyframes pulse {
				0%, 100% { transform: scaleY(1); }
				50% { transform: scaleY(1.2); }
			}
		`;
		document.head.appendChild(style);

		document.body.appendChild(this.domElement);
	}

	set progress(delta) {
		const percent = delta * 100;
		this.progressBar.style.width = `${percent}%`;
	}

	set visible(value) {
		if (value) {
			this.domElement.style.display = 'flex';
			this.domElement.style.opacity = '0.7';
		} else {
			this.domElement.style.transition = 'opacity 1s ease';
			this.domElement.style.opacity = '0';
			setTimeout(() => {
				this.domElement.style.display = 'none';
			}, 1000);
		}
	}
}

export { LoadingBar };
