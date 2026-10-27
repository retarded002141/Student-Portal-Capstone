import btechLogo from '../assets/logo.png';
import iitiLogo from '../assets/iitiLogo.png';
import headerBg from '../assets/Header.jpg';
import '../Stylesheets/Header.css';

function Header() {
  return (
    <div
      className="header"
      style={{ backgroundImage: `url(${headerBg})` }}
    >
      <img className="btechimg" src={btechLogo} alt="BTECH Logo" />

      <div className="header-right">
        <p className="header-text">
          INSTITUTE OF INFORMATION TECHNOLOGY
          AND INNOVATION - STUDENT PORTAL
        </p>

        <img className="iitiimg" src={iitiLogo} alt="IITI Logo" />
      </div>
    </div>
  );
}

export default Header;
