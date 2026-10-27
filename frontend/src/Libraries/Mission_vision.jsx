import "../Stylesheets/Mission_vision.css";

function Mission_vision() {
  return (
    <section className="mv-section">
      <div className="mv-container">
      
        <div className="mv-grid">
          <article className="mv-block reveal-on-scroll">
            <h3>Mission</h3>
            <p>
              To provide a comprehensive Information Technology education that
              equips students with strong technical knowledge, critical thinking
              skills, and practical competencies. The unit is committed to
              developing innovative, adaptable, and ethically grounded
              individuals who can effectively respond to the demands of the
              rapidly evolving digital world.
            </p>
          </article>

          <article className="mv-block mv-block--vision reveal-on-scroll delay-1">
            <h3>Vision</h3>
            <p>
              To be a leading academic unit in Information Technology education,
              recognized for producing highly skilled, innovative, and ethically
              responsible professionals who contribute to technological
              advancement and societal development.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

export default Mission_vision;