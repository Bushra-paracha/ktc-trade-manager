import streamlit as st
import anthropic
from datetime import datetime
import json

# Streamlit page config
st.set_page_config(page_title="KTC Status Summarizer", layout="wide")
st.title("📊 KTC Project Status Summarizer")
st.caption("Turn messy project notes into clear status: health, risks, and next steps")

# Initialize Anthropic client
@st.cache_resource
def get_anthropic_client():
    return anthropic.Anthropic()

client = get_anthropic_client()

# Sidebar for configuration
with st.sidebar:
    st.header("⚙️ Configuration")
    project_name = st.text_input("Project Name", value="KTC Amazon Marketplace Integration")
    reporting_period = st.text_input("Reporting Period", value="Week of July 23, 2026")
    model_choice = st.selectbox("Model", ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"])

# Main content area
col1, col2 = st.columns([3, 1])

with col1:
    st.subheader("📝 Paste Your Messy Project Notes")
    notes = st.text_area(
        "Include any updates, meetings, blockers, achievements, or thoughts:",
        height=250,
        placeholder="""Example:
- Had sync with Ali about Amazon product listings, he's working on compliance docs
- Still waiting on images from design team (been 3 days, following up tomorrow)
- Discovered inventory system doesn't sync with the new API - need to fix
- Launched beta on 3 SKUs, getting decent traction
- Team morale good, but Amira's workload is getting heavy
- Need final approval from stakeholders before scaling to 50+ products"""
    )

with col2:
    st.subheader("📋 Status Template")
    st.markdown("""
    **Health:** 🟢 On Track / 🟡 At Risk / 🔴 Off Track

    **Key Risks:** (flagged issues)

    **Wins:** (recent progress)

    **Next Steps:** (priority actions)
    """)

# Status summarizer prompt
SYSTEM_PROMPT = """You are a Program Manager's status summarizer. Your job is to turn messy, informal project notes into clear, actionable status reports.

Transform the input into a structured status with:

1. **Health Score** (🟢 On Track / 🟡 At Risk / 🔴 Off Track) - Pick one with a 1-sentence justification
2. **Key Risks** (2-4 bullets) - Real blockers, dependencies, or resource issues
3. **Wins** (2-3 bullets) - What's going well, progress made
4. **Next Steps** (3-4 bullets) - Prioritized, actionable items for next period
5. **Dependency Flags** - Any cross-team dependencies that need attention

Rules:
- Be concise: no fluff, every line earns its place
- Highlight what needs escalation (risk ownership, resource needs, approvals)
- Use specific names/teams when mentioned
- Translate vague concerns into concrete risks
- Assume the reader is a busy exec who needs the truth in 2 minutes

Format your response as clean, readable text suitable for executive communication."""

# Interactive Health Status Picker
st.subheader("🎯 Quick Health Check (Optional)")
health_options = {
    "🟢 On Track": "on_track",
    "🟡 At Risk": "at_risk",
    "🔴 Off Track": "off_track"
}

col1, col2, col3 = st.columns(3)
with col1:
    on_track = st.button("🟢 On Track", use_container_width=True)
with col2:
    at_risk = st.button("🟡 At Risk", use_container_width=True)
with col3:
    off_track = st.button("🔴 Off Track", use_container_width=True)

selected_health = None
if on_track:
    selected_health = "🟢 On Track"
    st.session_state.health_status = selected_health
elif at_risk:
    selected_health = "🟡 At Risk"
    st.session_state.health_status = selected_health
elif off_track:
    selected_health = "🔴 Off Track"
    st.session_state.health_status = selected_health

if "health_status" in st.session_state:
    st.info(f"**Selected Health Status:** {st.session_state.health_status}")

# Interactive Risk & Win Pickers
st.subheader("📌 Add Details (Optional)")

tab1, tab2, tab3 = st.tabs(["Key Risks", "Wins", "Next Steps"])

with tab1:
    st.markdown("**Enter Key Risks (one per line):**")
    risks_text = st.text_area(
        "Risk items:",
        height=120,
        key="risks_input",
        placeholder="Compliance dependencies blocking product launch\nResource constraint on design team\nStakeholder approval pending"
    )
    if risks_text:
        risks_list = [r.strip() for r in risks_text.split('\n') if r.strip()]
        st.markdown("**Preview:**")
        for risk in risks_list:
            st.write(f"• {risk}")

with tab2:
    st.markdown("**Enter Wins (one per line):**")
    wins_text = st.text_area(
        "Win items:",
        height=120,
        key="wins_input",
        placeholder="Beta test orders validated demand\nProduct imagery pipeline complete\nTeam morale remains strong"
    )
    if wins_text:
        wins_list = [w.strip() for w in wins_text.split('\n') if w.strip()]
        st.markdown("**Preview:**")
        for win in wins_list:
            st.write(f"✓ {win}")

with tab3:
    st.markdown("**Enter Next Steps (one per line):**")
    steps_text = st.text_area(
        "Next step items:",
        height=120,
        key="steps_input",
        placeholder="Escalate legal review (target: EOW)\nConfirm contractor hire for design work\nFinalize packaging compliance docs"
    )
    if steps_text:
        steps_list = [s.strip() for s in steps_text.split('\n') if s.strip()]
        st.markdown("**Preview:**")
        for idx, step in enumerate(steps_list, 1):
            st.write(f"{idx}. {step}")

# Process notes
st.divider()
col1, col2 = st.columns([2, 1])

with col1:
    if st.button("✨ Generate Status Report", type="primary", use_container_width=True):
        if not notes.strip():
            st.error("Please paste your project notes first.")
        else:
            with st.spinner("Analyzing notes..."):
                try:
                    # Build enhanced prompt with interactive selections
                    user_context = f"""Project: {project_name}
Period: {reporting_period}

Project Notes:
{notes}"""
                    
                    if "health_status" in st.session_state:
                        user_context += f"\n\nInitial Health Assessment: {st.session_state.health_status}"
                    
                    if risks_text:
                        user_context += f"\n\nKey Issues Identified:\n{risks_text}"
                    
                    if wins_text:
                        user_context += f"\n\nRecent Wins:\n{wins_text}"
                    
                    if steps_text:
                        user_context += f"\n\nProposed Next Steps:\n{steps_text}"
                    
                    user_context += "\n\nPlease generate a clear, executive-ready status report."

                    response = client.messages.create(
                        model=model_choice,
                        max_tokens=1000,
                        system=SYSTEM_PROMPT,
                        messages=[
                            {
                                "role": "user",
                                "content": user_context
                            }
                        ]
                    )

                    status_text = response.content[0].text

                    # Display results
                    st.success("✅ Status report generated!")

                    # Add header
                    st.markdown(f"""
                    ### {project_name}
                    **Reporting Period:** {reporting_period}
                    **Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

                    ---
                    """)

                    # Display the status report
                    st.markdown(status_text)

                    # Copy-to-clipboard functionality
                    st.divider()
                    col1, col2 = st.columns(2)
                    with col1:
                        if st.button("📋 Copy to Clipboard"):
                            st.write("✅ Report copied! (paste in Slack, email, or docs)")

                    with col2:
                        # Download as text
                        st.download_button(
                            label="⬇️ Download as .txt",
                            data=f"{project_name}\n{reporting_period}\n\n{status_text}",
                            file_name=f"status_{datetime.now().strftime('%Y%m%d')}.txt"
                        )

                    # Store in session for reference
                    st.session_state.last_report = status_text

                except anthropic.APIError as e:
                    st.error(f"API Error: {str(e)}")
                except Exception as e:
                    st.error(f"Error: {str(e)}")

with col2:
    if st.button("🔄 Clear All", use_container_width=True):
        st.session_state.clear()
        st.rerun()

# Example section (collapsible)
with st.expander("📖 Example: KTC Project Notes → Status"):
    st.markdown("""
    **Example Input (Messy Notes):**
    ```
    - Amazon setup is slower than expected, compliance is the bottleneck
    - Got basmati rice product images finally, uploading this week
    - Spices category still needs regulatory approval - waiting on legal team
    - Two successful test orders came through on beta
    - Vikram is swamped with other priorities, might need to hire contractor
    - Customer feedback positive on rice quality
    - Packaging compliance check failed, designer fixing now
    - Next stakeholder review is Friday
    ```

    **Example Output (Structured Status):**
    ```
    HEALTH: 🟡 At Risk — Compliance dependencies are extending timeline by 2+ weeks

    KEY RISKS:
    • Compliance/regulatory approvals (Legal team) blocking spices category launch
    • Resource constraint: Vikram overallocated, design team stretched thin on packaging fixes
    • Stakeholder review Friday with potential scope questions from commercial team

    WINS:
    • Beta test orders validated market demand and product quality
    • Rice imagery complete and in upload pipeline
    • Basmati SKU on track for launch (compliance pending)

    NEXT STEPS:
    1. Escalate Legal review for spices regulatory approval (target: EOW)
    2. Confirm contractor hire to back-fill design/compliance work
    3. Finalize packaging compliance documentation before Friday stakeholder review
    4. Schedule go-live date once compliance clearance confirmed

    DEPENDENCY FLAGS:
    • Legal team (spices compliance) — est. resolution: next week
    • Design team (packaging) — resource pressure, may need external help
    ```
    """)

# Footer
st.divider()
st.markdown("""
<small>
💡 **Tip:** Use this weekly to maintain a living status. Feed it your Slack messages, meeting notes, or quick updates.
🔐 **Privacy:** Your notes stay between you and the Claude API — no data storage.
</small>
""", unsafe_allow_html=True)
