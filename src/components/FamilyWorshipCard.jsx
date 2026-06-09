import { useState } from 'react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import {
  Users,
  Check,
  Plus,
  Link2,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  PenLine,
  Flame,
  BookOpen
} from 'lucide-react';
import useProgressStore from '../stores/progressStore';
import useGamificationStore from '../stores/gamificationStore';
import { haptics } from '../utils/native';

function FamilyWorshipCard() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekKey = format(weekStart, 'yyyy-MM-dd');
  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;

  const [expanded, setExpanded] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const progressStore = useProgressStore();
  const worship = progressStore.getFamilyWorship(weekKey);
  const worshipStreak = progressStore.getFamilyWorshipStreak();

  const [topicText, setTopicText] = useState(() => worship?.topic || '');
  const [notesText, setNotesText] = useState(() => worship?.notes || '');

  const {
    toggleFamilyWorshipComplete,
    updateFamilyWorship,
    addStudyLink,
    removeStudyLink,
  } = progressStore;

  const gamificationStore = useGamificationStore();
  const { recordFamilyWorshipCompletion } = gamificationStore;

  const handleToggleComplete = () => {
    haptics.light();
    toggleFamilyWorshipComplete(weekKey);

    if (!worship.completed) {
      haptics.success();
      recordFamilyWorshipCompletion();
    }
  };

  const handleAddLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      haptics.light();
      let url = newLinkUrl.trim();
      // Block dangerous schemes
      if (url.startsWith('javascript:') || url.startsWith('data:') || url.startsWith('vbscript:')) {
        return;
      }
      // Ensure URL has protocol
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      addStudyLink(weekKey, { title: newLinkTitle.trim(), url });
      setNewLinkTitle('');
      setNewLinkUrl('');
      setShowAddLink(false);
    }
  };

  const handleRemoveLink = (linkId) => {
    haptics.light();
    removeStudyLink(weekKey, linkId);
  };

  const handleOpenLink = (url) => {
    haptics.light();
    // Prevent XSS: only allow http/https URLs
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      console.warn('Blocked unsafe URL:', url);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveTopic = () => {
    if (topicText.trim()) {
      haptics.light();
      updateFamilyWorship(weekKey, { topic: topicText.trim() });
    }
  };

  const handleSaveNotes = () => {
    if (notesText.trim()) {
      haptics.light();
      updateFamilyWorship(weekKey, { notes: notesText.trim() });
    }
  };

  return (
    <article className="ios-grouped shadow-sm">
      {/* Row 1: Header - tappable to expand */}
      <button
        onClick={() => {
          haptics.light();
          setExpanded(!expanded);
        }}
        className={`ios-row w-full text-left active:bg-base-200/50 transition-colors ${worship.completed ? 'done' : ''}`}
      >
        <div className="ios-icon orange">
          <Users className="w-4 h-4" />
        </div>
        <div className="body">
          <div className="title">Family Worship</div>
          <div className="sub">Week of {weekLabel}</div>
        </div>
        {worshipStreak > 0 && (
          <div className="flex items-center gap-1 mr-2">
            <Flame className="w-3 h-3 text-warning animate-flame" />
            <span className="text-xs text-warning font-medium">{worshipStreak}w</span>
          </div>
        )}
        {worship.completed ? (
          <div className="ios-check done">
            <Check className="w-4 h-4" />
          </div>
        ) : expanded ? (
          <ChevronUp className="ios-chev" />
        ) : (
          <ChevronDown className="ios-chev" />
        )}
      </button>

      {/* Row 2: Completion toggle */}
      <button
        onClick={handleToggleComplete}
        className="ios-row w-full text-left active:bg-base-200/50 transition-colors"
      >
        <div className="body">
          <div className={`title ${worship.completed ? 'text-success' : ''}`}>
            {worship.completed ? 'Completed this week!' : 'Mark as complete'}
          </div>
        </div>
        <div className={`ios-check ${worship.completed ? 'done' : ''}`}>
          {worship.completed && <Check className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content - additional rows */}
      {expanded && (
        <>
          {/* Topic/Theme row */}
          <div className="ios-row">
            <div className="body">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-base-content/50" />
                <span className="text-sm text-base-content/70">Topic / Theme</span>
              </div>
              <input
                type="text"
                value={topicText}
                onChange={(e) => setTopicText(e.target.value)}
                onBlur={handleSaveTopic}
                placeholder="What will you study this week?"
                className="input input-bordered w-full"
              />
            </div>
          </div>

          {/* Study Links row */}
          <div className="ios-row flex-col items-start">
            <div className="w-full mb-2">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-base-content/50" />
                <span className="text-sm text-base-content/70">Study Links</span>
              </div>
            </div>

            {/* Existing Links */}
            {worship.studyLinks && worship.studyLinks.length > 0 && (
              <div className="space-y-2 w-full">
                {worship.studyLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 p-3 bg-base-200/50 rounded-xl"
                  >
                    <button
                      onClick={() => handleOpenLink(link.url)}
                      className="flex-1 flex items-center gap-2 text-left active:opacity-70"
                    >
                      <ExternalLink className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium text-primary truncate">
                        {link.title}
                      </span>
                    </button>
                    <button
                      onClick={() => handleRemoveLink(link.id)}
                      className="p-2 rounded-lg active:bg-base-300"
                    >
                      <Trash2 className="w-4 h-4 text-error" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Link Form */}
            {showAddLink ? (
              <div className="space-y-2 p-3 bg-base-200/30 rounded-xl w-full">
                <input
                  type="text"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  placeholder="Link title (e.g., 'Article Notes')"
                  className="input input-bordered input-sm w-full"
                />
                <input
                  type="url"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="URL (optional)"
                  className="input input-bordered input-sm w-full"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddLink}
                    disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    Add Link
                  </button>
                  <button
                    onClick={() => {
                      setShowAddLink(false);
                      setNewLinkTitle('');
                      setNewLinkUrl('');
                    }}
                    className="btn btn-ghost btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  haptics.light();
                  setShowAddLink(true);
                }}
                className="flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-base-300 rounded-xl text-base-content/50 active:bg-base-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Study Link
              </button>
            )}
          </div>

          {/* Notes row */}
          <div className="ios-row flex-col items-start">
            <div className="w-full mb-2">
              <div className="flex items-center gap-2">
                <PenLine className="w-4 h-4 text-base-content/50" />
                <span className="text-sm text-base-content/70">Notes</span>
              </div>
            </div>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Planning notes, discussion points, activities..."
              className="textarea textarea-bordered w-full min-h-[80px]"
              rows={3}
            />
          </div>
        </>
      )}
    </article>
  );
}

export default FamilyWorshipCard;