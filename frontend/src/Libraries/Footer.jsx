import "../Stylesheets/Footer.css";
import iitiLogo from "../assets/iitilogo.png";
import schoolLogo from "../assets/logo.png";

function Footer() {
  return (
    <footer className="footer reveal-on-scroll">
      <div className="footer-container">
        
        {/* LOGOS & IDENTITY */}
        <div className="footer-brand">
          <div className="footer-logos-row">
            <img src={iitiLogo} alt="IITI Logo" className="footer-logo" />
            <img src={schoolLogo} alt="School Logo" className="footer-logo second" />
          </div>
          <div className="footer-desc-group">
            <p className="footer-dept">Instituto ng Teknolohiya ng Impormasyon at Pagbabago</p>
            <p className="footer-school">Dalubhasaang Politekniko ng Lungsod ng Baliwag</p>
          </div>
        </div>

        {/* SOCIAL MEDIA & ORGS */}
        <div className="footer-links-wrapper">
          <div className="footer-social">
            <h2>Follow Us</h2>
            <ul>
              <li><a href="https://www.facebook.com/profile.php?id=61588685112058" target="_blank" rel="noopener noreferrer">IITI Official</a></li>
              <li><a href="https://www.facebook.com/BTECHDPLB" target="_blank" rel="noopener noreferrer">BTECH Official</a></li>
            </ul>
          </div>
          
          <div className="footer-orgs">
            <h2>Student Orgs</h2>
            <ul>
              <li><a href="https://www.facebook.com/SSITEBtech" target="_blank" rel="noopener noreferrer">SSITE</a></li>
              <li><a href="https://www.facebook.com/awsbtechccs" target="_blank" rel="noopener noreferrer">AWS BTECH</a></li>
            </ul>
          </div>
        </div>

        {/* CONTACT */}
        <div className="footer-contact">
          <h2>Contact Us</h2>
          <p>Email: emailngbtech@email.com</p>
          <p>Phone: +63 012 345 6789</p>
          <p>Address: Baliwag, Bulacan, Philippines</p>
        </div>

      </div>

      <div className="footer-bottom">
        <p>© 2026 IITI Student Portal. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;