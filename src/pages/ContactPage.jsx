import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FlipTripLogo from '../assets/FlipTripLogo.svg';
import { submitContactForm, CONTACT_REASON_OPTIONS } from '../services/api';
import { updatePageMeta } from '../utils/updatePageMeta';
import './ContactPage.css';

const initial = {
  name: '',
  email: '',
  company: '',
  reason: '',
  message: '',
  website: ''
};

export default function ContactPage() {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    updatePageMeta({
      title: 'Contact us | FlipTrip',
      description: 'Get in touch with FlipTrip — partnerships, feedback, press, or general questions.',
      canonicalPath: '/contact'
    });
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatus('sending');
    try {
      await submitContactForm({
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        reason: form.reason,
        message: form.message.trim(),
        website: form.website
      });
      setStatus('success');
      setForm(initial);
    } catch (err) {
      setStatus('idle');
      setErrorMsg(err?.response?.data?.error || err?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <main className="contact-page">
      <header className="contact-topbar">
        <div className="contact-topbar-inner">
          <Link to="/" className="contact-logo-link" aria-label="FlipTrip home">
            <img src={FlipTripLogo} alt="FlipTrip" className="contact-logo" />
          </Link>
          <Link to="/" className="contact-back-link">
            Explore tours →
          </Link>
        </div>
      </header>

      <div className="contact-shell">
        <h1 className="contact-heading">Contact us.</h1>
        <p className="contact-lead">
          Questions about tours, partnerships, or the project — send us a note and we&apos;ll get back to you.
        </p>

        {status === 'success' ? (
          <div className="contact-success" role="status">
            <p className="contact-success-title">Message sent</p>
            <p className="contact-success-text">Thanks — we&apos;ll reply as soon as we can.</p>
            <Link to="/" className="contact-back-home">Back to home</Link>
          </div>
        ) : (
          <form className="contact-form" onSubmit={onSubmit} noValidate>
            <label className="contact-label" htmlFor="contact-name">Name</label>
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              className="contact-input"
              value={form.name}
              onChange={onChange}
              required
              disabled={status === 'sending'}
            />

            <label className="contact-label" htmlFor="contact-email">Email</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              className="contact-input"
              value={form.email}
              onChange={onChange}
              required
              disabled={status === 'sending'}
            />

            <label className="contact-label" htmlFor="contact-company">Company</label>
            <input
              id="contact-company"
              name="company"
              type="text"
              autoComplete="organization"
              className="contact-input"
              value={form.company}
              onChange={onChange}
              disabled={status === 'sending'}
            />

            <label className="contact-label" htmlFor="contact-reason">Reason for reaching out</label>
            <select
              id="contact-reason"
              name="reason"
              className="contact-input contact-select"
              value={form.reason}
              onChange={onChange}
              required
              disabled={status === 'sending'}
            >
              <option value="" disabled>Select an option</option>
              {CONTACT_REASON_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>

            <label className="contact-label" htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              name="message"
              className="contact-input contact-textarea"
              rows={6}
              placeholder="Tell us more…"
              value={form.message}
              onChange={onChange}
              required
              disabled={status === 'sending'}
            />

            {/* Honeypot — leave hidden */}
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={onChange}
              className="contact-honeypot"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            {errorMsg ? <p className="contact-error" role="alert">{errorMsg}</p> : null}

            <button type="submit" className="contact-submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
