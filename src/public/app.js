// Attach a click handler to the button to show an alert
const btn = document.getElementById('popButton');
if (btn) {
	btn.addEventListener('click', () => {
		alert('pop');
	});
}

